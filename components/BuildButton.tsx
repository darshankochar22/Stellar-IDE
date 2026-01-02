"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

interface BuildButtonProps {
  onLog: (message: string, type: "log" | "error" | "warn" | "info") => void;
  projectName?: string;
  userId?: string;
}

export function BuildButton({ onLog, projectName, userId }: BuildButtonProps) {
  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuild = async () => {
    if (!projectName) {
      onLog("Project name is required to build", "error");
      return;
    }
    if (!userId) {
      onLog("Wallet connection required to build", "error");
      return;
    }

    setIsBuilding(true);
    onLog("🔨 Starting contract build...", "info");

    try {
      const response = await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buildContract",
          walletAddress: userId,
          projectName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onLog(`Build successful! (${data.wasmSize} bytes)`, "log");
      } else {
        onLog(` Build failed: ${data.error}`, "error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      onLog(` Build error: ${errorMessage}`, "error");
      console.error("Build error:", error);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <button
      onClick={handleBuild}
      disabled={isBuilding}
      className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#2a2a2a] disabled:bg-gray-600 text-white disabled:opacity-50 transition-colors flex items-center gap-2"
      title="Build contract (compile WASM)"
    >
      <Zap size={14} />
      {isBuilding ? "Building..." : "Build"}
    </button>
  );
}
