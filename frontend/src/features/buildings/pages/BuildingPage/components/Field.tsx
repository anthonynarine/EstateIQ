// # Filename: src/features/buildings/pages/BuildingPage/components/Field.tsx


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
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-neutral-300">
        {label}
      </span>

      <input
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
      />
    </label>
  );
}