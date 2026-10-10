"use client";

import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { PrivyAppProvider } from "@/components/wallet/privy-provider";
import { ToastProvider } from "@/components/ui/toast";
import { RPC_URL } from "@/lib/chain/config";

import { ProjectProvider, useProject } from "@/components/project-context";
import { getRpcUrl } from "@/lib/chain/config";

// @tidepay/sdk and Anchor use Node's global Buffer, which browsers lack.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

function DynamicConnectionProvider({ children }: { children: ReactNode }) {
  const { activeProject } = useProject();
  const endpoint = getRpcUrl(activeProject.environment, activeProject);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {children}
    </ConnectionProvider>
  );
}


import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrivyAppProvider>
        <ProjectProvider>
          <DynamicConnectionProvider>
            <ToastProvider>{children}</ToastProvider>
          </DynamicConnectionProvider>
        </ProjectProvider>
      </PrivyAppProvider>
    </ThemeProvider>
  );
}
