import { LayoutGrid, Image, MessageSquare, Settings } from "lucide-react";

export default function MobileFooter() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 z-10">
      <div className="flex justify-around">
        <a href="#" className="flex flex-col items-center text-blue-600">
          <LayoutGrid className="h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </a>
        <a href="#" className="flex flex-col items-center text-gray-500">
          <Image className="h-5 w-5" />
          <span className="text-xs mt-1">Media</span>
        </a>
        <a href="#" className="flex flex-col items-center text-gray-500">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">Comments</span>
        </a>
        <a href="#" className="flex flex-col items-center text-gray-500">
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">Settings</span>
        </a>
      </div>
    </div>
  );
}
