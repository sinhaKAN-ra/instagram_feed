import { LayoutGrid, Image, MessageSquare, LineChart, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="md:w-64 bg-white border-r border-gray-200 md:h-[calc(100vh-63px)] md:sticky md:top-[63px]">
      <nav className="md:pt-6 hidden md:flex flex-col">
        <a 
          href="#" 
          className="flex items-center space-x-3 px-4 py-3 text-blue-600 font-medium bg-blue-50 border-r-4 border-blue-600"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>Dashboard</span>
        </a>
        {/* <a 
          href="#" 
          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
        >
          <Image className="h-5 w-5" />
          <span>Media</span>
        </a>
        <a 
          href="#" 
          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Comments</span>
        </a>
        <a 
          href="#" 
          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
        >
          <LineChart className="h-5 w-5" />
          <span>Insights</span>
        </a>
        <a 
          href="#" 
          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </a> */}
      </nav>
    </aside>
  );
}
