"use client";

import Link from "next/link";
import { useState } from "react";

import type { NotificationDTO } from "@/lib/types/contracts";

export function NotificationCenter({ initialNotifications }: { initialNotifications: NotificationDTO[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);

  async function markRead(notificationId: string) {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              status: "READ",
            }
          : notification,
      ),
    );
  }

  return (
    <section className="space-y-3">
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-900">{notification.title}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                notification.status === "UNREAD"
                  ? "bg-orange-100 text-orange-900"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {notification.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-700">{notification.body}</p>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>{new Date(notification.createdAt).toLocaleString()}</span>
            {notification.dealId && (
              <>
                <span>•</span>
                <Link className="underline" href={`/deals/${notification.dealId}`}>
                  Open deal
                </Link>
              </>
            )}
          </div>

          {notification.status === "UNREAD" && (
            <button
              type="button"
              className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => {
                void markRead(notification.id);
              }}
            >
              Mark read
            </button>
          )}
        </article>
      ))}

      {notifications.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No notifications yet.
        </p>
      )}
    </section>
  );
}
