import { 
  users, 
  type User, 
  type InsertUser, 
  type InstagramUser,
  type InstagramMedia,
  type InstagramCommentReply
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private instagramProfiles: Map<string, InstagramUser>;
  private instagramMedia: Map<string, InstagramMedia[]>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.instagramProfiles = new Map();
    this.instagramMedia = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByInstagramId(instagramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.instagramId === instagramId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateOrCreateUserWithInstagram(instagramId: string, accessToken: string, refreshToken?: string): Promise<User> {
    const existingUser = await this.getUserByInstagramId(instagramId);
    
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        accessToken,
        refreshToken,
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      };
      this.users.set(existingUser.id, updatedUser);
      return updatedUser;
    }
    
    // Create a new user if one doesn't exist
    const id = this.currentId++;
    const newUser: User = {
      id,
      username: `instagram_${instagramId}`, // Default username
      password: '', // We don't need a password with OAuth
      instagramId,
      accessToken,
      refreshToken,
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserTokens(userId: number, accessToken: string, refreshToken?: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      accessToken,
      refreshToken,
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async storeInstagramProfile(instagramId: string, profile: InstagramUser): Promise<void> {
    this.instagramProfiles.set(instagramId, profile);
  }

  async getInstagramProfile(instagramId: string): Promise<InstagramUser | undefined> {
    return this.instagramProfiles.get(instagramId);
  }

  async storeInstagramMedia(instagramId: string, media: InstagramMedia[]): Promise<void> {
    this.instagramMedia.set(instagramId, media);
  }

  async getInstagramMedia(instagramId: string): Promise<InstagramMedia[] | undefined> {
    return this.instagramMedia.get(instagramId);
  }
}

export const storage = new MemStorage();
