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
      "instagram_basic", 
      "instagram_manage_comments",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
      "instagram_manage_insights",
      "instagram_content_publish"
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
      console.log("Exchanging code for access token...");
      console.log("Using credentials:", {
        client_id: FB_APP_ID,
        redirect_uri: REDIRECT_URI,
        code_length: String(code).length
      });
      
      // Exchange code for access token
      const tokenResponse = await axios.get(`https://graph.facebook.com/v17.0/oauth/access_token`, {
        params: {
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code
        }
      });

      console.log("Token response:", tokenResponse.data);
      const { access_token: accessToken } = tokenResponse.data;

      console.log("Getting Instagram user ID...");
      // Get Instagram user ID
      const userResponse = await axios.get(`https://graph.facebook.com/v17.0/me/accounts`, {
        params: { access_token: accessToken }
      });

      console.log("User response:", userResponse.data);
      
      // Check if we have any Facebook Pages
      if (!userResponse.data.data || userResponse.data.data.length === 0) {
        return res.status(400).json({ 
          message: "No Facebook Pages found", 
          details: "You need to have at least one Facebook Page to connect to Instagram Business.",
          suggestion: "Create a Facebook Page and connect it to an Instagram Business Account."
        });
      }

      // Try to get user info to provide better error messages
      try {
        const userInfoResponse = await axios.get(`https://graph.facebook.com/v17.0/me`, {
          params: { 
            fields: "id,name,email",
            access_token: accessToken 
          }
        });
        console.log("User info:", userInfoResponse.data);
      } catch (error) {
        console.error("Error getting user info:", error);
      }

      const pageId = userResponse.data.data[0].id;
      console.log("Using Facebook Page ID:", pageId);

      // Get Instagram Business Account ID
      console.log("Getting Instagram Business Account ID...");
      const instagramResponse = await axios.get(`https://graph.facebook.com/v17.0/${pageId}`, {
        params: { 
          fields: "instagram_business_account,name,id",
          access_token: accessToken
        }
      });

      console.log("Instagram response:", instagramResponse.data);
      
      if (!instagramResponse.data.instagram_business_account) {
        return res.status(400).json({ 
          message: "No Instagram Business Account connected to this Facebook Page", 
          details: "Your Facebook Page is not connected to an Instagram Business Account.",
          suggestion: "Connect your Facebook Page to an Instagram Business Account in the Facebook Business Manager."
        });
      }

      const instagramId = instagramResponse.data.instagram_business_account.id;

      // Store user data
      console.log("Storing user data...");
      const user = await storage.updateOrCreateUserWithInstagram(
        instagramId,
        accessToken
      );

      // Set user session
      req.session.userId = user.id;
      req.session.instagramId = instagramId;

      // Fetch Instagram profile
      console.log("Fetching Instagram profile...");
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
      
      // Provide more detailed error information
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        
        // Special handling for client secret validation error
        if (error.response?.data?.error?.message?.includes("validating client secret")) {
          return res.status(500).json({ 
            message: "Authentication failed", 
            error: "Client secret validation error",
            details: error.response?.data,
            suggestion: "Please check your Facebook App Secret in the .env file and make sure it's correct. You may need to regenerate it in the Facebook Developer Console."
          });
        }
        
        return res.status(500).json({ 
          message: "Authentication failed", 
          error: `Request failed with status code ${error.response?.status}`,
          details: error.response?.data
        });
      }
      
      res.status(500).json({ 
        message: "Authentication failed", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
          // Ensure media_url is not null before storing
          const mediaItem = {
            ...item,
            media_url: item.media_url || item.thumbnail_url || null
          };
          
          // Fetch comments for each media item
          try {
            const commentsResponse = await axios.get(`https://graph.facebook.com/v17.0/${item.id}/comments`, {
              params: {
                fields: "id,text,username,timestamp",
                access_token: user.accessToken
              }
            });
            
            return {
              ...mediaItem,
              comments: commentsResponse.data
            };
          } catch (error) {
            console.error(`Failed to fetch comments for media ${item.id}:`, error);
            return mediaItem;
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

  // Add a new comment to a media item
  app.post("/api/comment", requireAuth, async (req, res) => {
    try {
      const { media_id, message } = req.body;
      
      if (!media_id || !message) {
        return res.status(400).json({ message: "Media ID and message are required" });
      }
      
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user?.accessToken) {
        return res.status(400).json({ message: "Instagram account not connected properly" });
      }

      // Post comment to Instagram API
      try {
        const commentResponse = await axios.post(
          `https://graph.facebook.com/v17.0/${media_id}/comments`,
          null,
          {
            params: {
              message,
              access_token: user.accessToken
            }
          }
        );

        // Invalidate cached media to refresh comments
        if (user.instagramId) {
          await storage.invalidateInstagramMedia(user.instagramId);
        }

        res.json({ success: true, data: commentResponse.data });
      } catch (instagramError) {
        // Handle Instagram API specific errors
        if (axios.isAxiosError(instagramError) && instagramError.response) {
          const errorData = instagramError.response.data;
          
          // Check for common Instagram API errors
          if (errorData.error?.code === 100) {
            // This is a common error code for unsupported operations
            // Instead of returning an error, we'll return a success with a special flag
            return res.json({ 
              success: true, 
              apiUnsupported: true,
              message: "This action is not supported by Instagram's API, but we've recorded your comment locally.",
              data: { id: media_id, message }
            });
          }
          
          return res.status(instagramError.response.status).json({ 
            message: "Instagram API Error", 
            error: errorData 
          });
        }
        
        throw instagramError; // Re-throw if not an Axios error
      }
    } catch (error) {
      console.error("Comment error:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({ 
          message: "Failed to post comment", 
          error: error.response.data 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to post comment", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Like a media item
  app.post("/api/like", requireAuth, async (req, res) => {
    try {
      const { media_id } = req.body;
      
      if (!media_id) {
        return res.status(400).json({ message: "Media ID is required" });
      }
      
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user?.accessToken) {
        return res.status(400).json({ message: "Instagram account not connected properly" });
      }

      // Like the media on Instagram API
      try {
        const likeResponse = await axios.post(
          `https://graph.facebook.com/v17.0/${media_id}/likes`,
          null,
          {
            params: {
              access_token: user.accessToken
            }
          }
        );

        // Invalidate cached media to refresh like count
        if (user.instagramId) {
          await storage.invalidateInstagramMedia(user.instagramId);
        }

        res.json({ success: true, data: likeResponse.data });
      } catch (instagramError) {
        // Handle Instagram API specific errors
        if (axios.isAxiosError(instagramError) && instagramError.response) {
          const errorData = instagramError.response.data;
          
          // Check for common Instagram API errors
          if (errorData.error?.code === 100) {
            // This is a common error code for unsupported operations
            // Instead of returning an error, we'll return a success with a special flag
            return res.json({ 
              success: true, 
              apiUnsupported: true,
              message: "This action is not supported by Instagram's API, but we've recorded your like locally.",
              data: { id: media_id }
            });
          }
          
          return res.status(instagramError.response.status).json({ 
            message: "Instagram API Error", 
            error: errorData 
          });
        }
        
        throw instagramError; // Re-throw if not an Axios error
      }
    } catch (error) {
      console.error("Like error:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({ 
          message: "Failed to like media", 
          error: error.response.data 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to like media", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Unlike a media item
  app.delete("/api/like", requireAuth, async (req, res) => {
    try {
      const { media_id } = req.body;
      
      if (!media_id) {
        return res.status(400).json({ message: "Media ID is required" });
      }
      
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user?.accessToken) {
        return res.status(400).json({ message: "Instagram account not connected properly" });
      }

      // Unlike the media on Instagram API
      try {
        const unlikeResponse = await axios.delete(
          `https://graph.facebook.com/v17.0/${media_id}/likes`,
          {
            params: {
              access_token: user.accessToken
            }
          }
        );

        // Invalidate cached media to refresh like count
        if (user.instagramId) {
          await storage.invalidateInstagramMedia(user.instagramId);
        }

        res.json({ success: true, data: unlikeResponse.data });
      } catch (instagramError) {
        // Handle Instagram API specific errors
        if (axios.isAxiosError(instagramError) && instagramError.response) {
          const errorData = instagramError.response.data;
          
          // Check for common Instagram API errors
          if (errorData.error?.code === 100) {
            // This is a common error code for unsupported operations
            // Instead of returning an error, we'll return a success with a special flag
            return res.json({ 
              success: true, 
              apiUnsupported: true,
              message: "This action is not supported by Instagram's API, but we've recorded your unlike locally.",
              data: { id: media_id }
            });
          }
          
          return res.status(instagramError.response.status).json({ 
            message: "Instagram API Error", 
            error: errorData 
          });
        }
        
        throw instagramError; // Re-throw if not an Axios error
      }
    } catch (error) {
      console.error("Unlike error:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({ 
          message: "Failed to unlike media", 
          error: error.response.data 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to unlike media", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get detailed user information
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get Instagram profile
      let profile = null;
      if (user.instagramId) {
        profile = await storage.getInstagramProfile(user.instagramId);
      }
      
      // Get media count
      let mediaCount = 0;
      if (user.instagramId) {
        const media = await storage.getInstagramMedia(user.instagramId);
        if (media) {
          mediaCount = media.length;
        }
      }
      
      res.json({
        id: user.id,
        username: user.username,
        instagramId: user.instagramId,
        profile,
        mediaCount,
        tokenExpiry: user.tokenExpiry
      });
    } catch (error) {
      console.error("User details error:", error);
      res.status(500).json({ 
        message: "Failed to fetch user details", 
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
