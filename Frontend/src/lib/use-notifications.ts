"use client";

import { useSyncExternalStore } from "react";

/* ── Notification store (module-level, shared across components) ─────── */

export interface AppNotification {
  id: number;
  message: string;
  time: string;
}

let items: AppNotification[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function pushNotification(message: string) {
  items = [
    {
      id: Date.now(),
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...items.slice(0, 9), // cap at 10
  ];
  emit();
}

export function dismissNotification(id: number) {
  items = items.filter((n) => n.id !== id);
  emit();
}

export function clearNotifications() {
  items = [];
  emit();
}

/* ── React hook ─────────────────────────────────────────────────────── */

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): AppNotification[] {
  return items;
}

const serverSnapshot: AppNotification[] = [];
function getServerSnapshot(): AppNotification[] {
  return serverSnapshot;
}

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
