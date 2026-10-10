"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.08, wheelMultiplier: 1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
