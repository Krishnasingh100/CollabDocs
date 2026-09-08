"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

export function Room({
  documentId,
  children,
}: {
  documentId: string;
  children: ReactNode;
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={documentId}>
        <ClientSideSuspense
          fallback={
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
              Connecting…
            </div>
          }
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}