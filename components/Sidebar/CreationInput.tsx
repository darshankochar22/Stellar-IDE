/**
 * Creation Input Component
 * Input field for creating new files/folders
 */

import { X } from "lucide-react";
import type { CreationState } from "./types";

interface CreationInputProps {
  creatingItem: CreationState;
  newItemName: string;
  depth: number;
  onSetNewItemName: (name: string) => void;
  onConfirmCreateItem: () => void;
  onCancelCreateItem: () => void;
}

export default function CreationInput({
  creatingItem,
  newItemName,
  depth,
  onSetNewItemName,
  onConfirmCreateItem,
  onCancelCreateItem,
}: CreationInputProps) {
  if (!creatingItem) return null;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 bg-[#1e1e1e]"
      style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
    >
      <span className="text-gray-400 text-xs">
        {creatingItem.type === "file" ? "📄" : ""}
      </span>
      <input
        type="text"
        value={newItemName}
        onChange={(e) => onSetNewItemName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirmCreateItem();
          } else if (e.key === "Escape") {
            onCancelCreateItem();
          }
        }}
        onBlur={onConfirmCreateItem}
        autoFocus
        placeholder={
          creatingItem.type === "file" ? "filename.rs" : "foldername"
        }
        className="flex-1 bg-[#252525] text-white text-sm px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={onCancelCreateItem}
        className="p-1 hover:bg-[#333] rounded transition-colors"
      >
        <X className="w-3 h-3 text-gray-400" />
      </button>
    </div>
  );
}
