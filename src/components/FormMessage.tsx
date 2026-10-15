export default function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state) return null;
  if (state.error)
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{state.error}</div>;
  if (state.ok)
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">{state.ok}</div>;
  return null;
}
