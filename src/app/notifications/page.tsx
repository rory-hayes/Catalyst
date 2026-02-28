import { NotificationCenter } from "@/components/notification-center";
import { SetupRequired } from "@/components/setup-required";
import { getUserContext } from "@/lib/auth/session";
import { listNotifications } from "@/lib/services/notifications";

export default async function NotificationsPage() {
  let setupMessage: string | null = null;
  let notifications: Awaited<ReturnType<typeof listNotifications>> | null = null;

  try {
    const ctx = await getUserContext();
    notifications = await listNotifications(ctx.workspaceId, ctx.userId);
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!notifications) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Notification Center</h2>
        <p className="mt-1 text-sm text-slate-600">
          Personal reminders for stale deals, missing next steps, expired close dates, and escalation asks.
        </p>
      </header>

      <NotificationCenter initialNotifications={notifications} />
    </div>
  );
}
