export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  is_business?: boolean;
  media_count?: number;
  followers_count?: number;
  following_count?: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
}

export interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  comments?: {
    data: InstagramComment[];
  };
}

export interface CommentReplyPayload {
  comment_id: string;
  message: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId: number | null;
  instagramId: string | null;
}
