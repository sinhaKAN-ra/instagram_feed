import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import { instagramCommentReplySchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import MemoryStore from "memorystore";

// Extend express-session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    instagramId?: string;
  }
}

const MemoryStoreSession = MemoryStore(session);

// Load environment variables
dotenv.config();

// Output directly from process.env for debugging
console.log('Direct from process.env or secrets:');
console.log(`FACEBOOK_APP_ID=${process.env.FACEBOOK_APP_ID}`);
console.log(`FACEBOOK_APP_SECRET=${process.env.FACEBOOK_APP_SECRET ? '[SET]' : '[NOT SET]'}`);
console.log(`REDIRECT_URI=${process.env.REDIRECT_URI}`);

// Set up Facebook app credentials
const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Set up session
  app.use(session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'instagram-app-secret',
  }));

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Instagram authentication routes
  app.get("/api/auth/instagram", (req, res) => {
    const scopes = [
      "user_profile", 
      "user_media", 
      "instagram_basic", 
      "instagram_manage_comments"
    ].join(",");

    const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&response_type=code`;
    res.json({ authUrl });
  });

  app.get("/auth/instagram/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Authorization code missing" });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.get(`https://graph.facebook.com/v17.0/oauth/access_token`, {
        params: {
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code
        }
      });

      const { access_token: accessToken } = tokenResponse.data;

      // Get Instagram user ID
      const userResponse = await axios.get(`https://graph.facebook.com/v17.0/me/accounts`, {
        params: { access_token: accessToken }
      });

      if (!userResponse.data.data || userResponse.data.data.length === 0) {
        return res.status(400).json({ message: "No Instagram Business Account found" });
      }

      const pageId = userResponse.data.data[0].id;

      // Get Instagram Business Account ID
      const instagramResponse = await axios.get(`https://graph.facebook.com/v17.0/${pageId}`, {
        params: { 
          fields: "instagram_business_account",
          access_token: accessToken
        }
      });

      if (!instagramResponse.data.instagram_business_account) {
        return res.status(400).json({ 
          message: "No Instagram Business Account connected to this Facebook Page" 
        });
      }

      const instagramId = instagramResponse.data.instagram_business_account.id;

      // Store user data
      const user = await storage.updateOrCreateUserWithInstagram(
        instagramId,
        accessToken
      );

      // Set user session
      req.session.userId = user.id;
      req.session.instagramId = instagramId;

      // Fetch Instagram profile
      const profileResponse = await axios.get(`https://graph.facebook.com/v17.0/${instagramId}`, {
        params: {
          fields: "id,username,name,profile_picture_url,biography,website,followers_count,follows_count,media_count",
          access_token: accessToken
        }
      });

      await storage.storeInstagramProfile(instagramId, profileResponse.data);

      // Redirect to frontend
      res.redirect("/");
    } catch (error) {
      console.error("Instagram OAuth error:", error);
      res.status(500).json({ message: "Authentication failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // API endpoints
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const instagramId = req.session.instagramId;
      if (!instagramId) {
        return res.status(400).json({ message: "Instagram account not connected" });
      }

      const profile = await storage.getInstagramProfile(instagramId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/media", requireAuth, async (req, res) => {
    try {
      const instagramId = req.session.instagramId;
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!instagramId || !user?.accessToken) {
        return res.status(400).json({ message: "Instagram account not connected properly" });
      }

      // Check if we already have cached media
      const cachedMedia = await storage.getInstagramMedia(instagramId);
      if (cachedMedia) {
        return res.json(cachedMedia);
      }

      // Fetch media from Instagram API
      const mediaResponse = await axios.get(`https://graph.facebook.com/v17.0/${instagramId}/media`, {
        params: {
          fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
          access_token: user.accessToken
        }
      });

      if (!mediaResponse.data.data) {
        return res.json([]);
      }

      const media = await Promise.all(
        mediaResponse.data.data.map(async (item: any) => {
          // Fetch comments for each media item
          try {
            const commentsResponse = await axios.get(`https://graph.facebook.com/v17.0/${item.id}/comments`, {
              params: {
                fields: "id,text,username,timestamp",
                access_token: user.accessToken
              }
            });
            
            return {
              ...item,
              comments: commentsResponse.data
            };
          } catch (error) {
            console.error(`Failed to fetch comments for media ${item.id}:`, error);
            return item;
          }
        })
      );

      // Store media data in memory
      await storage.storeInstagramMedia(instagramId, media);

      res.json(media);
    } catch (error) {
      console.error("Media fetch error:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.post("/api/comment/reply", requireAuth, async (req, res) => {
    try {
      const validatedData = instagramCommentReplySchema.parse(req.body);
      const { comment_id, message } = validatedData;
      
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.accessToken) {
        return res.status(400).json({ message: "Instagram account not connected properly" });
      }

      const replyResponse = await axios.post(
        `https://graph.facebook.com/v17.0/${comment_id}/replies`,
        null,
        {
          params: {
            message,
            access_token: user.accessToken
          }
        }
      );

      res.json({ success: true, data: replyResponse.data });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Comment reply error:", error);
      res.status(500).json({ 
        message: "Failed to post comment reply", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.json({ success: true });
    });
  });

  // Check authentication status
  app.get("/api/auth/status", (req, res) => {
    res.json({ 
      authenticated: !!req.session.userId,
      userId: req.session.userId || null,
      instagramId: req.session.instagramId || null
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
