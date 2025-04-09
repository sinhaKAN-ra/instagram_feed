import { InstagramMedia } from "@/lib/types";
import MediaCard from "./MediaCard";

interface MediaGridProps {
  media: InstagramMedia[];
}

export default function MediaGrid({ media }: MediaGridProps) {
  if (!media || media.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow">
        <p className="text-gray-500">No media available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {media.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );
}
