"use client";

import useSWR from "swr";
import { api } from "../api/client";

export function useLegacySessions() {
  const { data, mutate, error, isLoading } = useSWR<any[]>("/live/legacy/list", api);
  return { sessions: data ?? [], refresh: mutate, error, isLoading };
}

export async function createLegacySession(payload: { instructorId: string; language: string; targetLevel: string }) {
  return api<any>("/live/legacy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinLegacySession(payload: { sessionId: string; studentId: string }) {
  return api<any>("/live/legacy/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
