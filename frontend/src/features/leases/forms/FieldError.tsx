// # Filename: src/components/forms/FieldError.tsx

type Props = {
  messages?: string[];
};

export default function FieldError({ messages }: Props) {
  if (!messages?.length) return null;

  return (
    <ul className="mt-1 space-y-1 text-xs text-red-200">
      {messages.map((m, i) => (
        <li key={`${m}-${i}`}>{m}</li>
      ))}
    </ul>
  );
}