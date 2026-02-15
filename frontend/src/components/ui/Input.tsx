// # Filename: src/components/ui/Input.tsx
// ✅ New Code
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = "", ...rest }: Props) {
  return (
    <label className="block w-full">
      {label ? (
        <div className="mb-1 text-sm font-medium text-text">{label}</div>
      ) : null}

      <input
        {...rest}
        className={[
          "w-full rounded-xl border bg-bg px-3 py-2 text-text",
          "border-border placeholder:text-muted",
          "app-focus",
          error ? "border-red-700 focus:ring-red-500/30" : "",
          className,
        ].join(" ")}
      />

      {error ? <div className="mt-1 text-xs text-red-400">{error}</div> : null}
    </label>
  );
}
