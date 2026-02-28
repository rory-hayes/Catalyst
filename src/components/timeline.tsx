import type { TimelineItemDTO } from "@/lib/types/contracts";

export function Timeline({ items }: { items: TimelineItemDTO[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Timeline</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">No timeline entries yet.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
