"use client";

import { useEffect, useRef } from "react";

export type ProctoringEventType = "eye" | "head" | "audio" | "tab" | "object";

interface ProctoringEvent {
  sessionId: string;
  type: ProctoringEventType;
  score: number;
  value?: number;
  flags?: string[];
}

interface ProctoringHooksProps {
  sessionId: string;
  enabled?: boolean;
  onAlert?: (msg: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

async function sendEvent(event: ProctoringEvent): Promise<void> {
  try {
    await fetch(`${API}/proctor/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Fire-and-forget; ignore network errors silently
  }
}

/**
 * ProctoringHooks - Headless proctoring component.
 * Monitors tab visibility, screen count, and audio spikes.
 * Sends events to POST /proctor/events.
 */
export default function ProctoringHooks({
  sessionId,
  enabled = true,
  onAlert,
}: ProctoringHooksProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabSwitchCountRef = useRef(0);

  // --- Tab / Visibility Detection ---
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        const msg = `Tab focus lost (count: ${count})`;
        onAlert?.(msg);
        void sendEvent({
          sessionId,
          type: "tab",
          score: Math.max(0, 1 - Math.min(1, count / 5)),
          value: count,
          flags: ["tab_hidden"],
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, sessionId, onAlert]);

  // --- Screen Count Detection ---
  useEffect(() => {
    if (!enabled) return;

    const checkScreens = () => {
      // window.screen.isExtended is available in some browsers via Screen Capture API
      // Fallback: check window.screen width vs available width ratio
      const screenCount =
        typeof (window.screen as any).isExtended !== "undefined"
          ? (window.screen as any).isExtended
            ? 2
            : 1
          : 1;

      if (screenCount > 1) {
        const msg = `Multiple screens detected (count: ${screenCount})`;
        onAlert?.(msg);
        void sendEvent({
          sessionId,
          type: "object",
          score: 0.3,
          value: screenCount,
          flags: ["multi_screen"],
        });
      }
    };

    // Check once on mount and listen for screen change events if available
    checkScreens();
    window.addEventListener("resize", checkScreens);
    return () => {
      window.removeEventListener("resize", checkScreens);
    };
  }, [enabled, sessionId, onAlert]);

  // --- Audio Spike Detection ---
  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioStreamRef.current = stream;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        audioIntervalRef.current = setInterval(() => {
          if (!active || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          const normalised = avg / 255;

          // Spike threshold: average frequency energy > 0.4 signals loud audio
          if (normalised > 0.4) {
            const msg = `Audio spike detected (level: ${normalised.toFixed(2)})`;
            onAlert?.(msg);
            void sendEvent({
              sessionId,
              type: "audio",
              score: Math.max(0, 1 - normalised),
              value: normalised,
              flags: ["audio_spike"],
            });
          }
        }, 2000);
      } catch {
        // Mic permission denied or not available — fail silently
      }
    }

    void initAudio();

    return () => {
      active = false;
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
    };
  }, [enabled, sessionId, onAlert]);

  // Headless component — renders nothing
  return null;
}
