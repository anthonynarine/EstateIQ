// # Filename: src/features/tenancy/components/PageStateCard.tsx

type Props = {
  title: string;
  description: string;
};

/**
 * PageStateCard
 *
 * Tiny reusable UI block for:
 * - missing org
 * - invalid route params
 * - other "page cannot render" states
 */
export default function PageStateCard({ title, description }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-lg font-semibold text-zinc-100">{title}</div>
        <div className="mt-2 text-sm text-zinc-400">{description}</div>
      </div>
    </div>
  );
}
