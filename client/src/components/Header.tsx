import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/instagram";
import { useLocation } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { InstagramUser } from "@/lib/types";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  profile?: InstagramUser;
}

export default function Header({ profile }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
      });
      setLocation('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "There was an error logging you out. Please try again.",
      });
    }
  };

  const username = profile?.username || "User";
  const name = profile?.name || "";
  const profileImage = profile?.profile_picture_url;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-800">
            <span className="hidden md:inline">Instagram Business</span> 
            <span className="md:hidden">IG Business</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block text-right">
            <p className="font-medium text-gray-900">{username}</p>
            <p className="text-sm text-gray-500">{name}</p>
          </div>
          <div className="relative">
            <Avatar>
              {profileImage ? (
                <AvatarImage src={profileImage} alt={username} />
              ) : (
                <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
              )}
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-white"></span>
            </Avatar>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
    </header>
  );
}
