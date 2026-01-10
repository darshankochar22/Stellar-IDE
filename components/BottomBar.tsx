"use client";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

interface BottomBarProps {
  openFile: FileNode | null;
  lspConnected?: boolean;
  lspError?: string | null;
  diagnosticsCount?: number;
  problemsCount?: number;
  errorsCount?: number;
  cursorPosition?: { line: number; column: number };
}

export default function BottomBar({
  openFile,
  lspConnected,
  lspError,
  diagnosticsCount = 0,
  problemsCount = 0,
  errorsCount = 0,
  cursorPosition = { line: 1, column: 1 },
}: BottomBarProps) {
  return (
    <div className="h-8 bg-[#171717] border-t border-[#252525] flex items-center justify-between px-3 shrink-0">
      <div className="text-xs text-gray-500 flex items-center gap-2">
        {openFile ? (
          <>
            <span>{openFile.name}</span>
            <span className="text-gray-600">|</span>
            <span>UTF-8</span>
          </>
        ) : (
          <span>No file selected</span>
        )}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-3">
        {/* LSP Status */}
        {openFile?.name.endsWith(".rs") && (
          <div className="flex items-center gap-1.5" suppressHydrationWarning>
            <span
              className={`w-2 h-2 rounded-full ${
                lspConnected
                  ? "bg-green-500"
                  : lspError
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
              title={
                lspConnected
                  ? "rust-analyzer connected"
                  : lspError || "Connecting..."
              }
              suppressHydrationWarning
            />
            <span
              className={
                lspConnected
                  ? "text-green-400"
                  : lspError
                  ? "text-red-400"
                  : "text-yellow-400"
              }
              suppressHydrationWarning
            >
              {lspConnected
                ? "rust-analyzer"
                : lspError
                ? "LSP Error"
                : "Connecting..."}
            </span>
            {problemsCount > 0 && (
              <span
                className={errorsCount > 0 ? "text-red-400" : "text-yellow-400"}
                suppressHydrationWarning
              >
                ({problemsCount}
                {errorsCount > 0 && ` ${errorsCount} error${errorsCount > 1 ? "s" : ""}`})
              </span>
            )}
          </div>
        )}
        {openFile
          ? `Ln ${cursorPosition.line}, Col ${cursorPosition.column}`
          : ""}
      </div>
    </div>
  );
}
