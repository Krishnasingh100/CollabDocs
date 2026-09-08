"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function PresenceAvatars() {
  const others = useOthers();
  const self = useSelf();

  return (
    <div className="flex -space-x-2">
      {others.slice(0, 4).map(({ connectionId, info }) => (
        <Avatar key={connectionId} className="h-7 w-7 border-2 border-background">
          <AvatarFallback className="text-xs">
            {(info?.name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {self && (
        <Avatar className="h-7 w-7 border-2 border-background">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {(self.info?.name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
