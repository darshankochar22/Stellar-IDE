"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat2,
  AlertCircle,
} from "lucide-react";
import { setAllowed, getAddress } from "@stellar/freighter-api";
import { useWallet } from "@/context/WalletContext";

interface Transaction {
  id: string;
  type: "send" | "receive" | "swap";
  amount: string;
  to?: string;
  from?: string;
  timestamp: string;
  status: "completed" | "pending";
}

interface WalletConnectProps {
  isConnected?: boolean;
  walletAddress?: string | null;
  walletBalance?: string;
  onConnect?: (address: string, balance: string) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({
  isConnected: externalIsConnected,
  walletAddress: externalWalletAddress,
  walletBalance: externalWalletBalance,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Get wallet context
  const walletContext = useWallet();

  // Use context if available, otherwise use external props, otherwise use internal state
  const isConnectedState =
    walletContext?.isConnected ?? externalIsConnected ?? false;
  const walletAddressState =
    walletContext?.walletAddress ?? externalWalletAddress;
  const walletBalanceState =
    walletContext?.walletBalance ?? externalWalletBalance ?? "0.00";

  // Prevent hydration mismatch by not rendering until client is hydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Mock transactions
  const [transactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "receive",
      amount: "100.00 XLM",
      from: "GBXXX...XXXX",
      timestamp: "2 hours ago",
      status: "completed",
    },
    {
      id: "2",
      type: "send",
      amount: "50.00 XLM",
      to: "GAYYY...YYYY",
      timestamp: "1 day ago",
      status: "completed",
    },
    {
      id: "3",
      type: "swap",
      amount: "25.00 XLM → 0.5 USDC",
      timestamp: "3 days ago",
      status: "completed",
    },
  ]);

  const fetchBalance = async (publicKey: string): Promise<string> => {
    try {
      // Fetch balance from Stellar testnet
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      );
      if (!response.ok) {
        return "0.00";
      }
      const data = await response.json();
      const nativeBalance = data.balances.find(
        (b: { asset_type: string; balance: string }) =>
          b.asset_type === "native"
      );
      return nativeBalance ? nativeBalance.balance : "0.00";
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0.00";
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      console.log("[WalletConnect] Starting wallet connection...");

      // Step 1: Request wallet access - this opens Freighter popup
      console.log("[WalletConnect] Requesting wallet access...");
      const allowed = await setAllowed();
      console.log("[WalletConnect] Permission result:", allowed);

      if (!allowed.isAllowed) {
        setError("Please approve wallet access in the Freighter popup.");
        setIsConnecting(false);
        return;
      }

      // Step 2: Get wallet address - should work after setAllowed
      console.log("[WalletConnect] Getting wallet address...");
      const addressData = await getAddress();
      console.log("[WalletConnect] Address data:", addressData);

      if (!addressData || !addressData.address) {
        console.error("[WalletConnect] No address in response:", addressData);
        throw new Error(
          "Could not get wallet address. Make sure you have selected an account in Freighter and approved access."
        );
      }

      const walletAddress = addressData.address;
      console.log("Connected wallet address:", walletAddress);

      // Fetch real balance from Stellar network
      const balance = await fetchBalance(walletAddress);

      // Create Docker container for this wallet
      try {
        console.log(`Creating container for wallet: ${walletAddress}`);
        const containerResponse = await fetch("/api/docker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            walletAddress,
          }),
        });

        if (!containerResponse.ok) {
          throw new Error(
            `Container API error: ${containerResponse.status} ${containerResponse.statusText}`
          );
        }

        const containerData = await containerResponse.json();
        if (containerData.success) {
          console.log(`Container created: ${containerData.containerName}`);
          walletContext.setContainerReady(true);
        } else {
          console.warn(`Container creation warning: ${containerData.error}`);
          // Don't fail the wallet connection if container already exists
          walletContext.setContainerReady(true);
        }
      } catch (containerError) {
        console.warn("Container creation error:", containerError);
        // Don't fail the wallet connection if there's a container error
        walletContext.setContainerReady(true);
      }

      // Update global wallet context
      walletContext.connect(walletAddress, balance);

      // Call the onConnect callback if provided (for backward compatibility)
      if (onConnect) {
        onConnect(walletAddress, balance);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[WalletConnect] Connection error:", errorMessage, error);

      // Show helpful error message
      if (
        errorMessage.includes("approved") ||
        errorMessage.includes("denied")
      ) {
        setError("Please approve wallet access in the Freighter popup.");
      } else if (
        errorMessage.includes("account") ||
        errorMessage.includes("address")
      ) {
        setError(
          "Could not get wallet address. Make sure you have an account in Freighter and approved access."
        );
      } else if (errorMessage.includes("locked")) {
        setError("Freighter is locked. Please unlock it with your password.");
      } else {
        setError(errorMessage || "Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setShowFullKey(false);
    setError(null);
    // Update global wallet context
    walletContext.disconnect();
    // Call the onDisconnect callback if provided (for backward compatibility)
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleCopyKey = async () => {
    if (walletAddressState) {
      await navigator.clipboard.writeText(walletAddressState);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const truncateKey = (key: string) => {
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  // Prevent hydration mismatch - render nothing until hydrated
  if (!isHydrated) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 text-white rounded-lg">
        <Wallet size={16} className="animate-pulse" />
        <span className="text-sm">Loading wallet...</span>
      </div>
    );
  }

  if (!isConnectedState) {
    return (
      <div>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 text-white hover:bg-white/5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          <Wallet size={16} />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <div className="absolute top-16 right-0 w-96 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-96 bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header with disconnect button */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-white font-semibold text-sm">Connected</p>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-red-400"
          title="Disconnect"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Balance Card */}
        <div className="bg-white/2 rounded-xl p-4 border border-white/5">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-semibold">
            Balance
          </p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold text-white">
              {walletBalanceState}
            </h2>
            <span className="text-gray-400 text-sm">XLM</span>
          </div>
        </div>

        {/* Action Buttons with Icons */}
        <div className="grid grid-cols-3 gap-3">
          <button className="py-3 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-xs font-semibold transition-all hover:text-white flex flex-col items-center gap-2">
            <ArrowUpRight size={18} className="text-white" />
            Send
          </button>
          <button className="py-3 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-xs font-semibold transition-all hover:text-white flex flex-col items-center gap-2">
            <ArrowDownLeft size={18} className="text-white" />
            Receive
          </button>
          <button className="py-3 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white text-xs font-semibold transition-all hover:text-white flex flex-col items-center gap-2">
            <Repeat2 size={18} className="text-white" />
            Swap
          </button>
        </div>

        {/* Public Key Section */}
        <div className="bg-white/2 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">
              Public Key
            </p>
            <button
              onClick={() => setShowFullKey(!showFullKey)}
              className="p-1 hover:bg-white/10 rounded transition-all text-gray-500 hover:text-gray-300"
              title={showFullKey ? "Hide" : "Show"}
            >
              {showFullKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2">
            <p className="text-gray-300 text-xs font-mono flex-1 truncate">
              {showFullKey
                ? walletAddressState
                : truncateKey(walletAddressState || "")}
            </p>
            <button
              onClick={handleCopyKey}
              className="p-1.5 hover:bg-white/10 rounded transition-all text-gray-500 hover:text-gray-300 flex-shrink-0"
              title="Copy public key"
            >
              {copiedKey ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white/2 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">
              Recent Activity
            </p>
            <p className="text-gray-600 text-xs cursor-pointer hover:text-gray-300">
              View All
            </p>
          </div>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    {tx.type === "send" && (
                      <ArrowUpRight size={14} className="text-white" />
                    )}
                    {tx.type === "receive" && (
                      <ArrowDownLeft size={14} className="text-white" />
                    )}
                    {tx.type === "swap" && (
                      <Repeat2 size={14} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-300 text-xs font-medium capitalize">
                      {tx.type}
                      {tx.to && ` to ${tx.to}`}
                      {tx.from && ` from ${tx.from}`}
                    </p>
                    <p className="text-gray-600 text-xs">{tx.timestamp}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-xs font-mono shrink-0 ml-2">
                  {tx.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-black/50 border-t border-white/5">
        <p className="text-gray-600 text-xs text-center">
          Freighter Wallet • Stellar Network
        </p>
      </div>
    </div>
  );
}
