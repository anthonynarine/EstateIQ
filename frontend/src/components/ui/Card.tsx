// # Filename: src/components/ui/Card.tsx

import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return <div className={["app-card p-5", className].join(" ")}>{children}</div>;
}

export function CardHeader({ children, className = "" }: Props) {
  return <div className={["mb-4", className].join(" ")}>{children}</div>;
}

export function CardTitle({ children, className = "" }: Props) {
  return <div className={["text-xl font-semibold text-text", className].join(" ")}>{children}</div>;
}

export function CardSubtitle({ children, className = "" }: Props) {
  return <div className={["mt-1 text-sm app-muted", className].join(" ")}>{children}</div>;
}
