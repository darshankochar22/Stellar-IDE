"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { DeployButton } from "./DeployButton";
import { BuildButton } from "./BuildButton";
import ToggleButtons from "./ToggleButtons";

interface TopBarProps {
  userId: string;
  connected: boolean;
  publicKey: string | null;
  isSaving: boolean;
  containerLoading: boolean;
  openFile: { name: string } | null;
  sidebarVisible: boolean;
  terminalVisible: boolean;
  leftComponentVisible: boolean;
  projectName?: string;
  onConnectWallet: () => Promise<void>;
  onDisconnectWallet: () => void;
  onSave: () => void | Promise<void>;
  onCreateContainer: () => void | Promise<void>;
  onDeleteContainer: () => void | Promise<void>;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onToggleLeftComponent: () => void;
  onLog: (message: string, type: "log" | "error" | "warn" | "info") => void;
}

export default function TopBar({
  userId,
  connected,
  publicKey,
  isSaving,
  containerLoading,
  openFile,
  sidebarVisible,
  terminalVisible,
  leftComponentVisible,
  projectName,
  onConnectWallet,
  onDisconnectWallet,
  onSave,
  onCreateContainer,
  onDeleteContainer,
  onToggleSidebar,
  onToggleTerminal,
  onToggleLeftComponent,
  onLog,
}: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = async () => {
    if (userId) {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-10 bg-[#171717] border-b border-[#252525] flex items-center justify-between px-3">
      <div className="flex items-center gap-3">
        {/* Back button and Project name */}
        {projectName && (
          <Link href="/home">
            <button
              className="text-xs px-2 py-1 rounded hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              title="Back to projects"
            >
              <ArrowLeft size={16} />
              <span className="font-medium text-white">{projectName}</span>
            </button>
          </Link>
        )}

        {userId && (
          <button
            onClick={handleCopyAddress}
            className="text-xs text-gray-500 hover:text-white hover:bg-white/10 px-2 py-1 rounded transition-all flex items-center gap-1"
            title="Click to copy wallet address"
          >
            <span>Wallet: {truncateAddress(userId)}</span>
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        )}

        {/* Wallet connection button - commented out, handle in home page only */}
        {/* {connected ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">
              {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
            </span>
            <button
              onClick={onDisconnectWallet}
              className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] text-white transition-colors"
          >
            Connect Wallet
          </button>
        )} */}

        {openFile && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] disabled:bg-gray-600 text-white disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save (⌘S)"}
          </button>
        )}

        {/* Create Container button - commented out, auto-created on wallet connect */}
        {/* <button
          onClick={onCreateContainer}
          disabled={containerLoading}
          className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] disabled:bg-gray-600 text-white disabled:opacity-50 transition-colors"
        >
          {containerLoading ? "Loading..." : "Create Container"}
        </button> */}

        {/* Delete Container button - commented out, manage from home page only */}
        {/* <button
          onClick={onDeleteContainer}
          disabled={containerLoading}
          className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] disabled:bg-gray-600 text-white disabled:opacity-50 transition-colors"
        >
          {containerLoading ? "Loading..." : "Delete Container"}
        </button> */}

        <BuildButton onLog={onLog} projectName={projectName} userId={userId} />
        <DeployButton onLog={onLog} projectName={projectName} />
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Toggle Buttons */}
      <ToggleButtons
        sidebarVisible={sidebarVisible}
        terminalVisible={terminalVisible}
        leftComponentVisible={leftComponentVisible}
        onToggleSidebar={onToggleSidebar}
        onToggleTerminal={onToggleTerminal}
        onToggleLeftComponent={onToggleLeftComponent}
      />
    </div>
  );
}
