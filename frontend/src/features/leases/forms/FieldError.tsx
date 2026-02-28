// # Filename: src/components/forms/FieldError.tsx


type Props = { messages?: string[] };

const prettify = (msg: string) => {
  // Step 1: Replace snake_case field names with human labels (global replace)
  return msg
    .replace(/\bend_date\b/gi, "End date")
    .replace(/\bstart_date\b/gi, "Start date")
    .replace(/\brent_due_day\b/gi, "Rent due day")
    .replace(/\bsecurity_deposit_amount\b/gi, "Security deposit")
    .replace(/\brent_amount\b/gi, "Rent amount");
};

export default function FieldError({ messages }: Props) {
  if (!messages?.length) return null;

  return (
    <ul className="mt-1 space-y-1 text-xs text-red-200">
      {messages.map((m, i) => (
        <li key={`${m}-${i}`}>{prettify(m)}</li>
      ))}
    </ul>
  );
}