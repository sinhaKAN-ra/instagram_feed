import { 
  type User, 
  type InsertUser, 
  type InstagramUser,
  type InstagramMedia
} from "@shared/schema";

import { DatabaseStorage } from "./DatabaseStorage";

export interface IStorage {
  getUser(id: number | undefined): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByInstagramId(instagramId: string): Promise<User | undefined>;
  updateOrCreateUserWithInstagram(instagramId: string, accessToken: string, refreshToken?: string): Promise<User>;
  updateUserTokens(userId: number, accessToken: string, refreshToken?: string): Promise<User | undefined>;
  storeInstagramProfile(instagramId: string, profile: InstagramUser): Promise<void>;
  getInstagramProfile(instagramId: string): Promise<InstagramUser | undefined>;
  storeInstagramMedia(instagramId: string, media: InstagramMedia[]): Promise<void>;
  getInstagramMedia(instagramId: string): Promise<InstagramMedia[] | undefined>;
}

// Using the database storage implementation
export const storage = new DatabaseStorage();
