"use client";

import { useSyncExternalStore } from "react";
import { pushNotification } from "./use-notifications";

function normalizeApiUrl(raw: string | undefined): string {
  const fallback = "http://localhost:8000/api";
  if (!raw) return fallback;

  const trimmed = raw.trim().replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const apiPath =
      normalizedPath === "" || normalizedPath === "/"
        ? "/api"
        : normalizedPath.endsWith("/api")
          ? normalizedPath
          : `${normalizedPath}/api`;
    return `${url.origin}${apiPath}`;
  } catch {
    return fallback;
  }
}

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api");
const POLL_INTERVAL = 15_000; // re-check every 15 s

export type BackendStatus = "checking" | "online" | "offline";

// ---------------------------------------------------------------------------
// Module-level external store (shared across all consumers)
// ---------------------------------------------------------------------------

let currentStatus: BackendStatus = "checking";
const listeners = new Set<() => void>();

function buildHealthCandidates(apiUrl: string): string[] {
  const urls: string[] = [];

  try {
    const parsed = new URL(apiUrl);
    const origin = parsed.origin;
    const path = parsed.pathname.replace(/\/+$/, "");
    const apiIdx = path.indexOf("/api");

    if (apiIdx >= 0) {
      const rootPath = path.slice(0, apiIdx);
      urls.push(`${origin}${rootPath}/health`);
    }

    urls.push(`${origin}/health`);
    urls.push(`${origin}/api/health`);

    if (parsed.hostname === "localhost") {
      urls.push(`${parsed.protocol}//127.0.0.1:${parsed.port || "8000"}/health`);
    }
    if (parsed.hostname === "127.0.0.1") {
      urls.push(`${parsed.protocol}//localhost:${parsed.port || "8000"}/health`);
    }
  } catch {
    const trimmed = apiUrl.replace(/\/+$/, "");
    urls.push(trimmed.replace(/\/api(?:\/.*)?$/, "/health"));
    urls.push(`${trimmed}/health`);
  }

  return [...new Set(urls)];
}

const HEALTH_CANDIDATES = buildHealthCandidates(API_URL);
let preferredHealthUrl = HEALTH_CANDIDATES[0] ?? "http://localhost:8000/health";

function notify() {
  for (const fn of listeners) fn();
}

function setStatus(next: BackendStatus) {
  if (next === currentStatus) return;
  const prev = currentStatus;
  currentStatus = next;
  notify();
  // Push notification on meaningful transitions (skip initial "checking")
  if (prev !== "checking") {
    if (next === "online") pushNotification("Backend connected — pipeline ready");
    if (next === "offline") pushNotification("Backend unreachable — using sample data");
  } else if (next === "online") {
    pushNotification("Backend connected — pipeline ready");
  }
}

async function ping() {
  const probeOrder = [
    preferredHealthUrl,
    ...HEALTH_CANDIDATES.filter((url) => url !== preferredHealthUrl),
  ];

  for (const url of probeOrder) {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        mode: "cors",
        signal: AbortSignal.timeout(4_000),
      });

      if (res.ok) {
        preferredHealthUrl = url;
        setStatus("online");
        return;
      }
    } catch {
      // try next candidate
    }
  }

  setStatus("offline");
}

/** Ping with one automatic retry after a short delay. */
async function pingWithRetry() {
  await ping();
  if (currentStatus === "offline") {
    // Backend may still be booting — retry once after 2 s
    await new Promise((r) => setTimeout(r, 2_000));
    await ping();
  }
}

// Start polling the first time any component subscribes
let polling = false;
function ensurePolling() {
  if (polling || typeof window === "undefined") return;
  polling = true;
  pingWithRetry();
  setInterval(pingWithRetry, POLL_INTERVAL);
}

function subscribe(cb: () => void) {
  ensurePolling();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): BackendStatus {
  return currentStatus;
}

function getServerSnapshot(): BackendStatus {
  return "checking";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Lightweight hook that pings the FastAPI /health endpoint
 * and exposes live backend reachability via useSyncExternalStore.
 */
export function useBackendStatus() {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { status, recheck: pingWithRetry };
}
