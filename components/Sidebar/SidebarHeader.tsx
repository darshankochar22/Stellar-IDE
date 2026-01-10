/**
 * Sidebar Header Component
 * Header with title and create buttons
 */

import { FilePlus, FolderPlus } from "lucide-react";

interface SidebarHeaderProps {
  onCreateFileRoot: () => void;
  onCreateFolderRoot: () => void;
  hasFiles: boolean;
}

export default function SidebarHeader({
  onCreateFileRoot,
  onCreateFolderRoot,
  hasFiles,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#252525] shrink-0">
      <span className="text-xs text-gray-400 font-semibold uppercase">
        Explorer
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onCreateFileRoot}
          className="p-1 hover:bg-[#252525] rounded transition-colors"
          title="New File"
          disabled={!hasFiles}
        >
          <FilePlus className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={onCreateFolderRoot}
          className="p-1 hover:bg-[#252525] rounded transition-colors"
          title="New Folder"
          disabled={!hasFiles}
        >
          <FolderPlus className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
