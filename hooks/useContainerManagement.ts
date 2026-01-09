"use client";

import { useCallback, useState, useRef, useEffect } from "react";

interface UseContainerManagementProps {
  walletAddress: string;
  logToTerminal: (message: string, type: "log" | "error" | "warn" | "info") => void;
  onContainerLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onTerminalOpen: (open: boolean) => void;
  onLoadFiles: () => Promise<void>;
  onClearFiles: () => void;
}

export function useContainerManagement({
  walletAddress,
  logToTerminal,
  onContainerLoading,
  onError,
  onTerminalOpen,
  onLoadFiles,
  onClearFiles,
}: UseContainerManagementProps) {
  const [containerName, setContainerName] = useState<string | null>(null);
  const hasCheckedRef = useRef(false);
  const lastWalletRef = useRef<string | null>(null);
  const logToTerminalRef = useRef(logToTerminal);
  
  // Keep log function ref updated
  useEffect(() => {
    logToTerminalRef.current = logToTerminal;
  }, [logToTerminal]);

  // Create Container
  const handleCreateContainer = useCallback(async () => {
    onContainerLoading(true);
    onError(null);
    onTerminalOpen(true); // Auto-open terminal
    logToTerminal("Creating Docker container...", "info");

    try {
      const response = await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        logToTerminal(`✓ ${data.message}`, "log");
        
        // Store container name for LSP connection
        if (data.containerName) {
          setContainerName(data.containerName);
          logToTerminal(` Container: ${data.containerName}`, "info");
        }

        // Log any setup output
        if (data.output) {
          data.output.split("\n").forEach((line: string) => {
            if (line.trim()) logToTerminal(line, "log");
          });
        }

        await onLoadFiles();
      } else {
        logToTerminal(
          `✗ Failed to create container: ${data.error}`,
          "error"
        );
        onError(`Failed to create container: ${data.error}`);
      }
    } catch (error) {
      logToTerminal(`✗ Failed to create container: ${error}`, "error");
      onError("Failed to create container");
    } finally {
      onContainerLoading(false);
    }
  }, [walletAddress, logToTerminal, onContainerLoading, onError, onTerminalOpen, onLoadFiles]);

  // Delete Container
  const handleDeleteContainer = useCallback(async () => {
    console.log("[Delete] handleDeleteContainer called with wallet:", walletAddress);
    
    if (!confirm(`Delete container for wallet ${walletAddress}?`)) {
      console.log("[Delete] User cancelled container deletion");
      return;
    }

    onContainerLoading(true);
    onError(null);
    onTerminalOpen(true);
    logToTerminal("Deleting Docker container...", "info");

    try {
      console.log("[Delete] Sending delete container request");
      const response = await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", walletAddress }),
      });

      const data = await response.json();
      console.log("[Delete] Container delete response:", data);

      if (data.success) {
        logToTerminal(`✓ ${data.message}`, "log");
        setContainerName(null);
        onClearFiles();
        // Reset check refs so container can be recreated
        hasCheckedRef.current = false;
        lastWalletRef.current = null;
      } else {
        logToTerminal(`✗ Failed to delete container: ${data.error}`, "error");
        onError(`Failed to delete container: ${data.error}`);
      }
    } catch (error) {
      console.error("[Delete] Container deletion error:", error);
      logToTerminal(`✗ Failed to delete container: ${error}`, "error");
      onError("Failed to delete container");
    } finally {
      onContainerLoading(false);
    }
  }, [walletAddress, logToTerminal, onContainerLoading, onError, onTerminalOpen, onClearFiles]);

  // Check container health and get container name on mount
  const checkAndSetContainerName = useCallback(async () => {
    if (!walletAddress || walletAddress === "not-connected") return;
    
    // Prevent duplicate checks for same wallet
    if (hasCheckedRef.current && lastWalletRef.current === walletAddress) {
      return;
    }
    
    hasCheckedRef.current = true;
    lastWalletRef.current = walletAddress;
    
    try {
      const response = await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkHealth", walletAddress }),
      });
      
      const data = await response.json();
      
      if (data.isHealthy) {
        // Container is running, derive container name from wallet address
        const prefix = walletAddress.slice(0, 10).toLowerCase();
        const derivedContainerName = `soroban-${prefix}`;
        setContainerName(derivedContainerName);
        logToTerminalRef.current(` Connected to container: ${derivedContainerName}`, "info");
      }
    } catch (error) {
      console.error("Failed to check container health:", error);
      // Reset check flag on error so it can retry
      hasCheckedRef.current = false;
    }
  }, [walletAddress]); // Only depend on walletAddress

  return {
    containerName,
    handleCreateContainer,
    handleDeleteContainer,
    checkAndSetContainerName,
  };
}

