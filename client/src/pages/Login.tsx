import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInstagramAuthUrl } from "@/lib/instagram";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { FaInstagram } from "react-icons/fa";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInstagramLogin = async () => {
    setIsLoading(true);
    try {
      const { authUrl } = await getInstagramAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Failed to initiate Instagram login. Please try again."
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Instagram Business Dashboard</h1>
            <p className="text-gray-500">Manage your Instagram business account easily</p>
          </div>
          
          <div className="flex flex-col items-center">
            <Button 
              onClick={handleInstagramLogin}
              disabled={isLoading}
              className="w-full py-6 text-white relative overflow-hidden group"
              style={{
                background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"
              }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <FaInstagram className="h-5 w-5 mr-2" />
              )}
              <span>Login with Instagram</span>
            </Button>
            
            <p className="mt-4 text-sm text-gray-500">
              Connect your Instagram Business or Creator account to manage comments and media.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
