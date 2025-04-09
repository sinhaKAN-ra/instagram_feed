import { InstagramUser, InstagramMedia, CommentReplyPayload, AuthStatus } from './types';
import { apiRequest } from './queryClient';

// Get Instagram Auth URL
export async function getInstagramAuthUrl(): Promise<{ authUrl: string }> {
  const response = await fetch('/api/auth/instagram');
  if (!response.ok) {
    throw new Error('Failed to get Instagram auth URL');
  }
  return response.json();
}

// Get current authentication status
export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch('/api/auth/status', {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to get authentication status');
  }
  return response.json();
}

// Logout the user
export async function logout(): Promise<void> {
  await fetch('/api/logout', {
    credentials: 'include'
  });
}

// Reply to a comment
export async function replyToComment(data: CommentReplyPayload): Promise<any> {
  const response = await apiRequest('POST', '/api/comment/reply', data);
  return response.json();
}

// Parse Instagram date to relative time
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo`;
}
