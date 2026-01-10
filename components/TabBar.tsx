"use client";

import React from "react";
import { X } from "lucide-react";

export type OpenFile = {
  path: string;
  name: string;
  isDirty?: boolean;
};

interface TabBarProps {
  openFiles: OpenFile[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFile,
  onSelectFile,
  onCloseFile,
}) => {
  const handleCloseClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    onCloseFile(path);
  };

  if (openFiles.length === 0) {
    return null;
  }

  return (
    <div className="h-10 flex items-center border-b border-[#252525] overflow-x-auto overflow-y-hidden bg-[#171717] tab-bar-scrollbar">
      <div className="flex flex-1 min-w-0">
        {openFiles.map((file) => {
          const isActive = file.path === activeFile;
          return (
            <div
              key={file.path}
              className={`
                flex items-center h-full px-3 cursor-pointer
                border-r border-[#252525]
                transition-all duration-150
                hover:bg-[#1f1f1f]
                ${
                  isActive
                    ? "bg-[#1e1e1e] text-[#ffffff]"
                    : "bg-[#171717] text-[#888888]"
                }
              `}
              onClick={() => onSelectFile(file.path)}
              title={file.path}
            >
              <span className="text-sm whitespace-nowrap mr-2 truncate max-w-xs">
                {file.name}
                {file.isDirty && (
                  <span className="ml-1 text-yellow-400">●</span>
                )}
              </span>
              <button
                className="ml-1 w-4 h-4 shrink-0 flex items-center justify-center rounded hover:bg-[#252525] transition-colors text-[#888888] hover:text-[#cccccc]"
                onClick={(e) => handleCloseClick(e, file.path)}
                title="Close file"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabBar;
