// # Filename: src/components/ui/Button.tsx
// ✅ New Code
import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

const styles: Record<ButtonVariant, string> = {
 primary:
  "bg-primary text-primaryText hover:bg-primary/95 hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] disabled:bg-zinc-400 disabled:text-zinc-700",
  secondary:
    "bg-zinc-800 text-text hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500",
  ghost:
    "bg-transparent text-text hover:bg-zinc-900/60 disabled:text-zinc-600",
  danger:
    "bg-danger text-dangerText hover:bg-red-500 disabled:bg-red-900 disabled:text-red-200",
};

export default function Button({
  variant = "primary",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
        "transition app-focus",
        styles[variant],
        className,
      ].join(" ")}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
