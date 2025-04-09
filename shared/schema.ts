import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  instagramId: text("instagram_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InstagramUser = z.infer<typeof instagramUserSchema>;
export type InstagramMedia = z.infer<typeof instagramMediaSchema>;
export type InstagramCommentReply = z.infer<typeof instagramCommentReplySchema>;
