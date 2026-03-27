'use client';

import { useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

type EventType =
  | 'CONTENT_VIEWED'
  | 'LESSON_COMPLETED'
  | 'QUIZ_ANSWERED'
  | 'VIDEO_DROPOFF'
  | 'LIVE_JOIN'
  | 'LIVE_LEAVE'
  | 'DOCUMENT_DOWNLOADED'
  | 'SEARCH';

interface TrackPayload {
  courseId?: string;
  lessonId?: string;
  quizId?: string;
  correct?: boolean;
  score?: number;
  durationSeconds?: number;
  query?: string;
  [key: string]: unknown;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') ?? localStorage.getItem('access_token');
}

/**
 * useTrackEvent — Lightweight learning event emitter.
 *
 * Fires fire-and-forget POST /event-stream/emit calls.
 * Errors are silently swallowed to never block UX.
 *
 * Usage:
 *   const track = useTrackEvent();
 *   track('CONTENT_VIEWED', { courseId: 'abc', lessonId: 'xyz' });
 */
export function useTrackEvent() {
  const track = useCallback((eventType: EventType, payload: TrackPayload = {}) => {
    const token = getToken();
    if (!token) return; // not authenticated — skip

    // Map to EventStreamService.emit() shape
    const objectId = payload.courseId ?? payload.lessonId ?? payload.quizId ?? 'unknown';
    const objectType = payload.courseId ? 'Course' : payload.lessonId ? 'Lesson' : payload.quizId ? 'Quiz' : 'Page';
    const body = JSON.stringify({
      eventType,
      objectType,
      objectId,
      objectName: payload.page as string | undefined,
      result: { correct: payload.correct, score: payload.score, duration: payload.durationSeconds },
      metadata: payload,
    });

    // Fire and forget — no await
    fetch(`${API}/event-stream/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    }).catch(() => {
      // Silently ignore — never block UX
    });
  }, []);

  return track;
}
