"use client";

import type { ReactNode } from "react";

/** Centered modal scrim + panel shared by every overlay. */
export function OverlayShell({
  children,
  width = 680,
}: {
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-7"
      style={{ background: "rgba(8,10,13,.74)" }}
    >
      <div
        className="w-full max-h-[88vh] overflow-auto bg-panel border border-edge-2 rounded-2xl p-6 animate-fade"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}
