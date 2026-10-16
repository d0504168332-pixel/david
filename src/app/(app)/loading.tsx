/** מוצג מיד במעבר בין עמודים, עד שהנתונים מגיעים */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="טוען">
      <div className="mb-7 h-9 w-48 rounded-xl bg-stone-200/80" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-200/70" />
        ))}
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[72px] rounded-2xl bg-stone-200/60" />
        ))}
      </div>
    </div>
  );
}
