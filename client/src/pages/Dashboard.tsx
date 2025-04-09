import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getAuthStatus } from "@/lib/instagram";
import { Loader2 } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileFooter from "@/components/MobileFooter";
import ProfileStats from "@/components/ProfileStats";
import MediaGrid from "@/components/MediaGrid";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Check authentication status
  const { data: authStatus, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/status'],
    staleTime: 60000, // 1 minute
  });

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/profile'],
    enabled: !!authStatus?.authenticated,
  });

  // Fetch media data
  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ['/api/media'],
    enabled: !!authStatus?.authenticated,
  });

  useEffect(() => {
    if (authStatus && !authStatus.authenticated) {
      setLocation('/login');
    }
  }, [authStatus, setLocation]);

  const isLoading = authLoading || profileLoading || mediaLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header profile={profile} />
      
      <div className="flex flex-col md:flex-row flex-1">
        <Sidebar />
        
        <main className="flex-1 p-4 md:p-6 bg-gray-50">
          <ProfileStats profile={profile} />
          
          <h2 className="text-xl font-bold mb-4">Recent Media</h2>
          <MediaGrid media={media || []} />
          
          {media && media.length > 0 && (
            <div className="text-center mt-6">
              <button className="bg-gray-100 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-200 transition">
                Load More
              </button>
            </div>
          )}
        </main>
      </div>
      
      <MobileFooter />
    </div>
  );
}
