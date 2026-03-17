"use client";

import useSWR from "swr";
import { api } from "../api/client";

export function useBookings(type: "instructor" | "student", id: string) {
  const key = id ? `/booking/${type}/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<any[]>(key, api, { revalidateOnFocus: false });
  return { bookings: data ?? [], error, isLoading, refresh: mutate };
}

export function createBooking(payload: {
  instructorId: string;
  studentId: string;
  start: string;
  end: string;
  meetingLink?: string;
}) {
  return api<any>("/booking", { method: "POST", body: JSON.stringify(payload) });
}

export function cancelBooking(id: string) {
  return api<any>(`/booking/${id}/cancel`, { method: "PATCH" });
}
