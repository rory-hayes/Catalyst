export function SetupRequired({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">Setup Required</p>
      <h2 className="mt-2 text-xl font-bold tracking-tight">Infrastructure is not configured yet</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <div className="mt-4 rounded-xl border border-amber-300 bg-white p-3 text-sm">
        <p className="font-semibold">Minimum required:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>`DATABASE_URL` (Postgres)</li>
          <li>`REDIS_URL` (for worker queues)</li>
          <li>`npm run db:push` and `npm run db:seed` on target environment</li>
        </ul>
      </div>
    </div>
  );
}
