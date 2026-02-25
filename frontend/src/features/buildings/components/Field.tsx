// # Filename: src/features/buildings/components/Field.tsx

type Props = {
    label: string;
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    type?: React.HTMLInputTypeAttribute;
    disabled?: boolean;
  };
  
  export default function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    disabled = false,
  }: Props) {
    // Step 1: Render input field
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-white/70">{label}</span>
        <input
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 disabled:opacity-60"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          disabled={disabled}
        />
      </label>
    );
  }