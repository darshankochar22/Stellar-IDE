"use client";

import { useCallback, useRef, useEffect } from "react";
import type { LogMessage } from "@/components/Terminal";

interface UseTerminalLoggingProps {
  onLogsUpdate: (logs: LogMessage[]) => void;
}

export function useTerminalLogging({ onLogsUpdate }: UseTerminalLoggingProps) {
  const messageCountRef = useRef(0);
  const onLogsUpdateRef = useRef(onLogsUpdate);
  
  // Keep ref updated
  useEffect(() => {
    onLogsUpdateRef.current = onLogsUpdate;
  }, [onLogsUpdate]);

  // Log to terminal - deferred to avoid setState during render
  const logToTerminal = useCallback(
    (message: string, type: "log" | "error" | "warn" | "info" = "log") => {
      // Use setTimeout to defer state update and avoid render conflicts
      setTimeout(() => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
        onLogsUpdateRef.current([
        {
          id: messageCountRef.current++,
          message,
          timestamp,
          type,
        },
      ]);
      }, 0);
    },
    []
  );

  // Intercept console methods - disabled to prevent render conflicts
  // Console logs will only show in browser devtools, not in terminal panel
  // Use logToTerminal explicitly for terminal output

  return {
    logToTerminal,
    messageCountRef,
  };
}

