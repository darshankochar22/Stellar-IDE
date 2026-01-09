/**
 * Right Component State Management
 * Manages all state for the Right component
 */

import { useState, useEffect, useRef } from "react";
import type { LogMessage } from "../components/Terminal";

interface UseRightStateProps {
  terminalVisible: boolean;
}

interface UseRightStateReturn {
  fontSize: number;
  setFontSize: (size: number) => void;
  containerLoading: boolean;
  setContainerLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  terminalOpen: boolean;
  setTerminalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  logs: LogMessage[];
  setLogs: React.Dispatch<React.SetStateAction<LogMessage[]>>;
  terminalHeight: number;
  setTerminalHeight: (height: number) => void;
  mounted: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useRightState({ terminalVisible }: UseRightStateProps): UseRightStateReturn {
  const [fontSize, setFontSize] = useState(14);
  const [containerLoading, setContainerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(terminalVisible);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Prevent hydration mismatch - wallet state comes from localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync terminal visibility
  useEffect(() => {
    setTerminalOpen(terminalVisible);
  }, [terminalVisible]);

  return {
    fontSize,
    setFontSize,
    containerLoading,
    setContainerLoading,
    error,
    setError,
    terminalOpen,
    setTerminalOpen,
    logs,
    setLogs,
    terminalHeight,
    setTerminalHeight,
    mounted,
    containerRef,
  };
}
