"use client";

import { useState } from "react";
import { deployWithWallet } from "@/lib/wallet-deploy";
import { useWallet } from "@/context/WalletContext";

interface DeployButtonProps {
  onLog: (message: string, type: "log" | "error" | "warn" | "info") => void;
  projectName?: string;
}

export function DeployButton({ onLog, projectName }: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const wallet = useWallet();

  const handleDeploy = async () => {
    if (!wallet.walletAddress) {
      onLog(" Wallet address not found", "error");
      return;
    }

    // Check wallet connection
    if (!wallet.isConnected) {
      onLog("  Wallet not connected. Connecting...", "warn");
      await wallet.connect(wallet.walletAddress, wallet.walletBalance);

      // Give it a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!wallet.isConnected) {
        onLog(" Wallet connection required", "error");
        return;
      }
    }

    setIsDeploying(true);
    onLog("", "log");
    onLog("", "info");
    onLog("DEPLOYING CONTRACT", "info");
    onLog("", "info");
    onLog(` Project: ${projectName || "default"}`, "info");
    onLog(
      ` Wallet: ${wallet.walletAddress.slice(
        0,
        8
      )}...${wallet.walletAddress.slice(-6)}`,
      "info"
    );
    onLog("", "log");

    try {
      const result = await deployWithWallet(
        wallet.walletAddress,
        (msg: string, type: string) => {
          onLog(msg, type as "log" | "error" | "warn" | "info");
        },
        projectName
      );

      if (result.success) {
        onLog("", "log");
        onLog("", "log");
        onLog(" DEPLOYMENT SUCCESSFUL", "log");
        onLog("", "log");
        onLog(` Contract ID: ${result.contractId}`, "log");
        onLog("", "log");
        // Show success message
        alert(` Contract deployed!\nContract ID: ${result.contractId}`);
      } else {
        onLog("", "log");
        onLog("", "error");
        onLog(" DEPLOYMENT FAILED", "error");
        onLog("", "error");
        onLog(`${result.error}`, "error");
        onLog("", "log");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      onLog("", "log");
      onLog("", "error");
      onLog(" DEPLOYMENT ERROR", "error");
      onLog("", "error");
      onLog(`${errorMessage}`, "error");
      onLog("", "log");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <button
      onClick={handleDeploy}
      disabled={isDeploying || !wallet.walletAddress}
      className="text-xs px-3 py-1 rounded dark:bg-black hover:bg-[#171717] disabled:bg-gray-800 text-white disabled:opacity-50 transition-colors"
    >
      {isDeploying ? (
        <span className="flex items-center">
          <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
            {/* spinner SVG */}
          </svg>
          Deploying...
        </span>
      ) : (
        "Deploy"
      )}
    </button>
  );
}
