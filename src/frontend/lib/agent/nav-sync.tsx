"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

type AgentNavSyncContextValue = {
  refreshAgentNav: () => Promise<void>;
};

const AgentNavSyncContext = React.createContext<AgentNavSyncContextValue | null>(
  null,
);

export function AgentNavSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const refreshAgentNav = React.useCallback(async () => {
    router.refresh();
  }, [router]);

  const value = React.useMemo(
    () => ({ refreshAgentNav }),
    [refreshAgentNav],
  );

  return (
    <AgentNavSyncContext.Provider value={value}>
      {children}
    </AgentNavSyncContext.Provider>
  );
}

export function useAgentNavRefresh(): () => Promise<void> {
  const ctx = React.useContext(AgentNavSyncContext);
  return ctx?.refreshAgentNav ?? (async () => undefined);
}
