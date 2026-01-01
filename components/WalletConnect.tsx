"use client";

import { useState } from "react";
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
import { isConnected, setAllowed, getAddress } from "@stellar/freighter-api";

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

  // Use external state if provided, otherwise use internal state
  const isConnectedState = externalIsConnected ?? false;
  const walletAddressState = externalWalletAddress;
  const walletBalanceState = externalWalletBalance ?? "0.00";

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
      // Check if wallet is already connected
      const connected = await isConnected();

      if (!connected.isConnected) {
        // Request wallet access
        const allowed = await setAllowed();
        if (!allowed.isAllowed) {
          setError("Wallet access denied. Please approve in Freighter.");
          setIsConnecting(false);
          return;
        }
      }

      // Get the wallet address
      const addressData = await getAddress();
      if (!addressData.address) {
        throw new Error("Could not retrieve wallet address");
      }

      const walletAddress = addressData.address;
      console.log("Connected wallet address:", walletAddress);

      // Fetch real balance from Stellar network
      const balance = await fetchBalance(walletAddress);

      // Call the onConnect callback if provided
      if (onConnect) {
        onConnect(walletAddress, balance);
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      setError(error.message || "Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setShowFullKey(false);
    setError(null);
    // Call the onDisconnect callback if provided
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
