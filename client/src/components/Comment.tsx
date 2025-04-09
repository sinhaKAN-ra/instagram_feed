import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { InstagramComment } from "@/lib/types";
import { formatRelativeTime, replyToComment } from "@/lib/instagram";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CommentProps {
  comment: InstagramComment;
}

export default function Comment({ comment }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { id, text, username, timestamp } = comment;
  const formattedTime = formatRelativeTime(timestamp);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await replyToComment({
        comment_id: id,
        message: replyText
      });
      
      setReplyText("");
      setShowReplyForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      
      toast({
        title: "Reply Posted",
        description: "Your reply has been posted successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Post Reply",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="comment-item">
      <div className="flex items-start gap-2">
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-xs">{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs font-medium">{username}</p>
            <p className="text-xs">{text}</p>
          </div>
          <div className="flex items-center mt-1 pl-1">
            <button 
              className="text-xs text-gray-500 hover:text-blue-500"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              Reply
            </button>
            <span className="text-xs text-gray-400 mx-2">•</span>
            <span className="text-xs text-gray-400">{formattedTime}</span>
          </div>
        </div>
      </div>
      
      {/* Reply Form */}
      {showReplyForm && (
        <div className="ml-8 mt-2">
          <form className="flex items-center" onSubmit={handleReplySubmit}>
            <Input
              className="flex-1 bg-gray-50 border border-gray-200 text-sm"
              placeholder="Reply to this comment..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              className="ml-2 bg-blue-500 text-white text-sm"
              disabled={!replyText.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
