"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface WalletContextType {
  walletAddress: string | null;
  walletBalance: string;
  isConnected: boolean;
  isConnecting: boolean;
  containerName: string | null;
  isContainerReady: boolean;

  // Actions
  setWalletAddress: (address: string | null) => void;
  setWalletBalance: (balance: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setContainerReady: (ready: boolean) => void;

  // Helper methods
  connect: (address: string, balance: string) => void;
  disconnect: () => void;
  getContainerName: () => string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // Initialize wallet state from localStorage
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("wallet_address");
  });

  const [walletBalance, setWalletBalance] = useState<string>(() => {
    if (typeof window === "undefined") return "0.00";
    return localStorage.getItem("wallet_balance") || "0.00";
  });

  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wallet_address") !== null;
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);

  // Generate container name from wallet address
  const getContainerName = useCallback((): string | null => {
    if (!walletAddress) return null;
    const prefix = walletAddress.slice(0, 10).toLowerCase();
    return `soroban-${prefix}`;
  }, [walletAddress]);

  // Connect wallet
  const connect = useCallback(
    (address: string, balance: string) => {
      setWalletAddress(address);
      setWalletBalance(balance);
      setIsConnected(true);
      setIsConnecting(false);
      // Persist to localStorage
      localStorage.setItem("wallet_address", address);
      localStorage.setItem("wallet_balance", balance);
      console.log(`[WalletContext] Connected: ${address}`);
      console.log(`[WalletContext] Container: ${getContainerName()}`);
    },
    [getContainerName]
  );

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletBalance("0.00");
    setIsConnected(false);
    setIsContainerReady(false);
    // Clear localStorage
    localStorage.removeItem("wallet_address");
    localStorage.removeItem("wallet_balance");
    console.log("[WalletContext] Disconnected");
  }, []);

  const value: WalletContextType = {
    walletAddress,
    walletBalance,
    isConnected,
    isConnecting,
    containerName: getContainerName(),
    isContainerReady,
    setWalletAddress,
    setWalletBalance,
    setIsConnected,
    setIsConnecting,
    setContainerReady: setIsContainerReady,
    connect,
    disconnect,
    getContainerName,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
