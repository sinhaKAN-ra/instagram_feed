import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table stores basic user information and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  instagramId: text("instagram_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(instagramProfiles, {
    fields: [users.instagramId],
    references: [instagramProfiles.instagramId],
  }),
  media: many(instagramMedia),
}));

// Instagram profiles table stores profile data from the Instagram API
export const instagramProfiles = pgTable("instagram_profiles", {
  id: serial("id").primaryKey(),
  instagramId: text("instagram_id").notNull().unique(),
  username: text("username").notNull(),
  name: text("name"),
  profilePictureUrl: text("profile_picture_url"),
  biography: text("biography"),
  website: text("website"),
  isBusiness: boolean("is_business"),
  mediaCount: integer("media_count"),
  followersCount: integer("followers_count"),
  followingCount: integer("following_count"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Instagram profiles relationships
export const instagramProfilesRelations = relations(instagramProfiles, ({ one }) => ({
  user: one(users, {
    fields: [instagramProfiles.instagramId],
    references: [users.instagramId],
  }),
}));

// Instagram media table stores media data from the Instagram API
export const instagramMedia = pgTable("instagram_media", {
  id: serial("id").primaryKey(),
  instagramId: text("instagram_id").notNull(),
  mediaId: text("media_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  mediaType: text("media_type").notNull(),
  mediaUrl: text("media_url").notNull(),
  permalink: text("permalink").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  timestamp: text("timestamp").notNull(),
  likeCount: integer("like_count"),
  commentsCount: integer("comments_count"),
  commentsData: jsonb("comments_data"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Instagram media relationships
export const instagramMediaRelations = relations(instagramMedia, ({ one }) => ({
  user: one(users, {
    fields: [instagramMedia.userId],
    references: [users.id],
  }),
}));

// Insert schemas for database operations
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInstagramProfileSchema = createInsertSchema(instagramProfiles);
export const insertInstagramMediaSchema = createInsertSchema(instagramMedia);

// Validation schemas for API requests
export const instagramUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().optional(),
  profile_picture_url: z.string().optional(),
  biography: z.string().optional(),
  website: z.string().optional(),
  is_business: z.boolean().optional(),
  media_count: z.number().optional(),
  followers_count: z.number().optional(),
  following_count: z.number().optional(),
});

export const instagramMediaSchema = z.object({
  id: z.string(),
  media_type: z.string(),
  media_url: z.string(),
  permalink: z.string(),
  thumbnail_url: z.string().optional(),
  caption: z.string().optional(),
  timestamp: z.string(),
  like_count: z.number().optional(),
  comments_count: z.number().optional(),
  comments: z.object({
    data: z.array(z.object({
      id: z.string(),
      text: z.string(),
      username: z.string(),
      timestamp: z.string(),
    })),
  }).optional(),
});

export const instagramCommentReplySchema = z.object({
  comment_id: z.string(),
  message: z.string(),
});

// Types for use in application code
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InstagramProfile = typeof instagramProfiles.$inferSelect;
export type InstagramMediaItem = typeof instagramMedia.$inferSelect;
export type InstagramUser = z.infer<typeof instagramUserSchema>;
export type InstagramMedia = z.infer<typeof instagramMediaSchema>;
export type InstagramCommentReply = z.infer<typeof instagramCommentReplySchema>;
