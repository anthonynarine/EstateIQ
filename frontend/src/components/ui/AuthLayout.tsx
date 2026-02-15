// # Filename: src/components/ui/AuthLayout.tsx
// ✅ New Code
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      {/* Step 1: subtle background texture (no heavy images) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black" />
        {/* Soft glow */}
        <div className="absolute left-1/2 top-[-120px] h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Step 2: responsive vertical positioning */}
      <div
        className={[
          "mx-auto w-full max-w-md px-4",
          // Mobile: start a bit lower than top (comfortable thumb reach)
          "pt-10 pb-10",
          // Desktop: center vertically
          "md:min-h-[100dvh] md:grid md:place-items-center md:py-0",
        ].join(" ")}
      >
        {/* Step 3: keep the card from stretching on desktop grid */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
