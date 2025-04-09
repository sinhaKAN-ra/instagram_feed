import { InstagramUser } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileStatsProps {
  profile?: InstagramUser;
}

export default function ProfileStats({ profile }: ProfileStatsProps) {
  if (!profile) {
    return (
      <Card className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <CardContent className="p-0">
          <div className="text-center py-4">
            <p>No profile data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    username, 
    profile_picture_url, 
    biography, 
    media_count = 0, 
    followers_count = 0, 
    following_count = 0
  } = profile;

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Card className="bg-white rounded-lg shadow mb-6">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-2 border-gray-200">
              {profile_picture_url ? (
                <AvatarImage src={profile_picture_url} alt={username} className="object-cover" />
              ) : (
                <AvatarFallback className="text-3xl">{username?.charAt(0).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{username}</h2>
            <p className="text-gray-500 mb-4">{biography || "No biography available"}</p>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xl font-bold">{formatCount(media_count)}</p>
                <p className="text-gray-500 text-sm">Posts</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xl font-bold">{formatCount(followers_count)}</p>
                <p className="text-gray-500 text-sm">Followers</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xl font-bold">{formatCount(following_count)}</p>
                <p className="text-gray-500 text-sm">Following</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
