import { useState } from "react";
import { InstagramMedia } from "@/lib/types";
import { formatRelativeTime, postComment, likeMedia, unlikeMedia } from "@/lib/instagram";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageSquare, Image as ImageIcon, Film } from "lucide-react";
import Comment from "./Comment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MediaCardProps {
  item: InstagramMedia;
}

export default function MediaCard({ item }: MediaCardProps) {
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const {
    id,
    media_type,
    media_url,
    caption,
    timestamp,
    like_count = 0,
    comments_count = 0,
    comments
  } = item;

  const mediaTypeIcon = media_type === 'VIDEO' ? <Film className="mr-1 h-3 w-3" /> : <ImageIcon className="mr-1 h-3 w-3" />;
  const mediaTypeLabel = media_type === 'VIDEO' ? 'Video' : 'Image';
  const formattedTime = formatRelativeTime(timestamp);
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setIsCommentSubmitting(true);
    try {
      const response = await postComment({
        media_id: id,
        message: commentText
      });
      
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      
      // Check if the API doesn't support this operation
      if (response.apiUnsupported) {
        toast({
          title: "Comment Recorded Locally",
          description: "Instagram's API doesn't support this action, but we've recorded your comment in the app.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Comment Posted",
          description: "Your comment has been posted successfully.",
        });
      }
    } catch (error) {
      // Check if this is an API error with a specific message
      let errorMessage = "An unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract the error message from the API response
        const errorObj = error as any;
        if (errorObj.error?.error?.message) {
          errorMessage = errorObj.error.error.message;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Failed to Post Comment",
        description: errorMessage,
      });
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleLikeToggle = async () => {
    setIsSubmitting(true);
    try {
      if (isLiked) {
        const response = await unlikeMedia({ media_id: id });
        setIsLiked(false);
        
        // Check if the API doesn't support this operation
        if (response.apiUnsupported) {
          toast({
            title: "Like Recorded Locally",
            description: "Instagram's API doesn't support this action, but we've recorded your like in the app.",
            duration: 5000,
          });
        }
      } else {
        const response = await likeMedia({ media_id: id });
        setIsLiked(true);
        
        // Check if the API doesn't support this operation
        if (response.apiUnsupported) {
          toast({
            title: "Like Recorded Locally",
            description: "Instagram's API doesn't support this action, but we've recorded your like in the app.",
            duration: 5000,
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
    } catch (error) {
      // Check if this is an API error with a specific message
      let errorMessage = "An unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract the error message from the API response
        const errorObj = error as any;
        if (errorObj.error?.error?.message) {
          errorMessage = errorObj.error.error.message;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: errorMessage,
      });
      
      // Don't change the like state if the API call failed
      setIsLiked(isLiked);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden">
      <div className="relative pb-[100%]">
        <img 
          src={media_url}
          alt="Instagram post" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center">
          {mediaTypeIcon}
          <span>{mediaTypeLabel}</span>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex space-x-3">
            <button 
              className={`text-gray-700 hover:text-red-500 transition flex items-center ${isLiked ? 'text-red-500' : ''}`}
              // onClick={handleLikeToggle}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Heart className="h-4 w-4 mr-1" />
              )}
              <span className="text-xs">{like_count}</span>
            </button>
            <button className="text-gray-700 hover:text-blue-500 transition flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="text-xs">{comments_count}</span>
            </button>
          </div>
          <span className="text-xs text-gray-500">{formattedTime}</span>
        </div>
        
        {caption && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{caption}</p>
        )}
        
        {/* Comments Section */}
        <div className="border-t border-gray-100 pt-3 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Recent Comments</h4>
          
          {comments && comments.data && comments.data.length > 0 ? (
            comments.data.slice(0, 2).map((comment) => (
              <Comment key={comment.id} comment={comment} />
            ))
          ) : (
            <p className="text-xs text-gray-500">No comments yet</p>
          )}
          
          {/* Add Comment */}
          <form className="mt-3 flex items-center" onSubmit={handleCommentSubmit}>
            <Input
              className="flex-1 bg-gray-50 border border-gray-200 text-sm"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isCommentSubmitting}
            />
            <Button 
              type="submit" 
              className="ml-2 bg-blue-500 text-white text-sm"
              disabled={!commentText.trim() || isCommentSubmitting}
            >
              {isCommentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
