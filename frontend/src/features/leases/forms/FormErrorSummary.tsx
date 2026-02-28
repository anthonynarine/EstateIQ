// # Filename: src/components/forms/FormErrorSummary.tsx

type Props = {
  title?: string;
  errors: string[];
};

export default function FormErrorSummary({ title = "Please fix the errors below", errors }: Props) {
  if (!errors.length) return null;

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
      <div className="font-semibold text-red-200">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100">
        {errors.map((m, i) => (
          <li key={`${m}-${i}`}>{m}</li>
        ))}
      </ul>
    </div>
  );
}