import { 
  users, 
  instagramProfiles,
  instagramMedia,
  type User, 
  type InsertUser,
  type InstagramUser,
  type InstagramMedia,
  type InstagramProfile,
  type InstagramMediaItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getUser(id: number | undefined): Promise<User | undefined> {
    if (id === undefined) return undefined;
    
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByInstagramId(instagramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.instagramId, instagramId));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    const [user] = await db.insert(users).values({
      ...insertUser,
      instagramId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      createdAt: now
    }).returning();
    
    return user;
  }

  async updateOrCreateUserWithInstagram(instagramId: string, accessToken: string, refreshToken?: string): Promise<User> {
    const existingUser = await this.getUserByInstagramId(instagramId);
    const now = new Date();
    const tokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
    
    if (existingUser) {
      const [updatedUser] = await db.update(users)
        .set({
          accessToken,
          refreshToken: refreshToken || null,
          tokenExpiry
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      
      return updatedUser;
    }
    
    // Create a new user
    const [newUser] = await db.insert(users).values({
      username: `instagram_${instagramId}`,
      password: '',
      instagramId,
      accessToken,
      refreshToken: refreshToken || null,
      tokenExpiry,
      createdAt: now
    }).returning();
    
    return newUser;
  }

  async updateUserTokens(userId: number, accessToken: string, refreshToken?: string): Promise<User | undefined> {
    const tokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
    
    const [updatedUser] = await db.update(users)
      .set({
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiry
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async storeInstagramProfile(instagramId: string, profile: InstagramUser): Promise<void> {
    const existingProfile = await db.select()
      .from(instagramProfiles)
      .where(eq(instagramProfiles.instagramId, instagramId));
    
    const now = new Date();
    
    if (existingProfile.length > 0) {
      await db.update(instagramProfiles)
        .set({
          username: profile.username,
          name: profile.name || null,
          profilePictureUrl: profile.profile_picture_url || null,
          biography: profile.biography || null,
          website: profile.website || null,
          isBusiness: profile.is_business !== undefined ? profile.is_business : null,
          mediaCount: profile.media_count || null,
          followersCount: profile.followers_count || null,
          followingCount: profile.following_count || null,
          updatedAt: now
        })
        .where(eq(instagramProfiles.instagramId, instagramId));
    } else {
      await db.insert(instagramProfiles).values({
        instagramId,
        username: profile.username,
        name: profile.name || null,
        profilePictureUrl: profile.profile_picture_url || null,
        biography: profile.biography || null,
        website: profile.website || null,
        isBusiness: profile.is_business !== undefined ? profile.is_business : null,
        mediaCount: profile.media_count || null,
        followersCount: profile.followers_count || null,
        followingCount: profile.following_count || null,
        updatedAt: now
      });
    }
  }

  async getInstagramProfile(instagramId: string): Promise<InstagramUser | undefined> {
    const result = await db.select().from(instagramProfiles).where(eq(instagramProfiles.instagramId, instagramId));
    
    if (result.length === 0) return undefined;
    
    const profile = result[0];
    
    // Transform database profile to Instagram API format
    return {
      id: profile.instagramId,
      username: profile.username,
      name: profile.name || undefined,
      profile_picture_url: profile.profilePictureUrl || undefined,
      biography: profile.biography || undefined,
      website: profile.website || undefined,
      is_business: profile.isBusiness || undefined,
      media_count: profile.mediaCount || undefined,
      followers_count: profile.followersCount || undefined,
      following_count: profile.followingCount || undefined
    };
  }

  async storeInstagramMedia(instagramId: string, mediaItems: InstagramMedia[]): Promise<void> {
    // Get the user ID from the instagramId
    const user = await this.getUserByInstagramId(instagramId);
    if (!user) return;
    
    const now = new Date();
    
    // For each media item, upsert it into the database
    for (const item of mediaItems) {
      const existingMedia = await db.select()
        .from(instagramMedia)
        .where(eq(instagramMedia.mediaId, item.id));
      
      if (existingMedia.length > 0) {
        await db.update(instagramMedia)
          .set({
            mediaType: item.media_type,
            mediaUrl: item.media_url,
            permalink: item.permalink,
            thumbnailUrl: item.thumbnail_url || null,
            caption: item.caption || null,
            timestamp: item.timestamp,
            likeCount: item.like_count || null,
            commentsCount: item.comments_count || null,
            commentsData: item.comments ? item.comments : null,
            updatedAt: now
          })
          .where(eq(instagramMedia.mediaId, item.id));
      } else {
        await db.insert(instagramMedia).values({
          instagramId,
          mediaId: item.id,
          userId: user.id,
          mediaType: item.media_type,
          mediaUrl: item.media_url,
          permalink: item.permalink,
          thumbnailUrl: item.thumbnail_url || null,
          caption: item.caption || null,
          timestamp: item.timestamp,
          likeCount: item.like_count || null,
          commentsCount: item.comments_count || null,
          commentsData: item.comments ? item.comments : null,
          updatedAt: now
        });
      }
    }
  }

  async getInstagramMedia(instagramId: string): Promise<InstagramMedia[] | undefined> {
    const result = await db.select()
      .from(instagramMedia)
      .where(eq(instagramMedia.instagramId, instagramId))
      .orderBy(desc(instagramMedia.timestamp));
    
    if (result.length === 0) return undefined;
    
    // Transform database media to Instagram API format
    return result.map(item => ({
      id: item.mediaId,
      media_type: item.mediaType,
      media_url: item.mediaUrl,
      permalink: item.permalink,
      thumbnail_url: item.thumbnailUrl || undefined,
      caption: item.caption || undefined,
      timestamp: item.timestamp,
      like_count: item.likeCount || undefined,
      comments_count: item.commentsCount || undefined,
      comments: item.commentsData as any
    }));
  }
}