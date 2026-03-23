"use client";

import { useEffect, useRef, useCallback } from "react";

export interface ProctoringMonitorProps {
  sessionId: string;
  apiBase: string;
  onTrustScore?: (score: number) => void;
  onAlert?: () => void;
}

type EventType = "TAB" | "AUDIO";

interface ProctoringEventPayload {
  sessionId: string;
  type: EventType;
  value?: number;
  flags?: string[];
  timestamp: string;
}

/**
 * ProctoringMonitor — headless proctoring component.
 *
 * Monitors:
 *  - Tab visibility changes (TAB event)
 *  - Basic audio spikes via Web Audio API (AUDIO event)
 *  - Screen/window count (factored into trust score)
 *
 * Events are batched and sent every 5 seconds to POST /proctor/events.
 * No UI is rendered; the component operates entirely in the background.
 */
export default function ProctoringMonitor({
  sessionId,
  apiBase,
  onTrustScore,
  onAlert,
}: ProctoringMonitorProps) {
  // Pending events waiting to be flushed
  const pendingEventsRef = useRef<ProctoringEventPayload[]>([]);
  // Running trust score (0–1), starts at 1 (fully trusted)
  const trustScoreRef = useRef<number>(1);
  // Tab switch count for scoring
  const tabSwitchCountRef = useRef<number>(0);
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const enqueueEvent = useCallback((evt: ProctoringEventPayload) => {
    pendingEventsRef.current.push(evt);
  }, []);

  const degradeTrust = useCallback(
    (delta: number) => {
      trustScoreRef.current = Math.max(0, trustScoreRef.current - delta);
      onTrustScore?.(trustScoreRef.current);
      if (trustScoreRef.current < 0.5) {
        onAlert?.();
      }
    },
    [onTrustScore, onAlert],
  );

  // ------------------------------------------------------------------
  // Flush loop — runs every 5 seconds
  // ------------------------------------------------------------------
  useEffect(() => {
    const flush = async () => {
      const batch = pendingEventsRef.current.splice(0);
      if (batch.length === 0) return;

      for (const evt of batch) {
        try {
          await fetch(`${apiBase}/proctor/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(evt),
          });
        } catch {
          // Fire-and-forget; network errors are silently ignored
        }
      }
    };

    const timer = setInterval(() => void flush(), 5000);
    return () => clearInterval(timer);
  }, [apiBase]);

  // ------------------------------------------------------------------
  // Tab visibility monitoring
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        tabSwitchCountRef.current += 1;
        degradeTrust(0.1);
        enqueueEvent({
          sessionId,
          type: "TAB",
          value: tabSwitchCountRef.current,
          flags: ["tab_hidden"],
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, enqueueEvent, degradeTrust]);

  // ------------------------------------------------------------------
  // Screen / window count check (fires once on mount & on resize)
  // ------------------------------------------------------------------
  useEffect(() => {
    const checkScreens = () => {
      const isExtended =
        typeof (window.screen as any).isExtended !== "undefined"
          ? (window.screen as any).isExtended
          : false;
      if (isExtended) {
        degradeTrust(0.05);
        onAlert?.();
      }
    };

    checkScreens();
    window.addEventListener("resize", checkScreens);
    return () => window.removeEventListener("resize", checkScreens);
  }, [degradeTrust, onAlert]);

  // ------------------------------------------------------------------
  // Audio spike detection via Web Audio API
  // ------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    let audioInterval: ReturnType<typeof setInterval> | null = null;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
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

        audioInterval = setInterval(() => {
          if (!active || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          const normalised = avg / 255;

          // Spike threshold: average frequency energy > 0.4
          if (normalised > 0.4) {
            degradeTrust(0.05);
            enqueueEvent({
              sessionId,
              type: "AUDIO",
              value: normalised,
              flags: ["audio_spike"],
              timestamp: new Date().toISOString(),
            });
          }
        }, 2000);
      } catch {
        // Microphone permission denied or unavailable — fail silently
      }
    };

    void initAudio();

    return () => {
      active = false;
      if (audioInterval) clearInterval(audioInterval);
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
  }, [sessionId, enqueueEvent, degradeTrust]);

  // Headless — renders nothing
  return null;
}
