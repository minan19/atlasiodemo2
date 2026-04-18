"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { WhiteboardLocal, WhiteboardLocalHandle, WhiteboardTool } from "../../whiteboard/whiteboard-local";
import { useI18n } from "../../_i18n/use-i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}
async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Participant {
  id: string; name: string; online: boolean; handRaised: boolean;
  muted?: boolean; videoOff?: boolean;
  speaking?: boolean; presenting?: boolean; screenSharing?: boolean;
}
interface SessionData {
  sessionId: string; participants: Participant[]; status: string;
  controls?: Record<string, unknown>;
}
interface LogEntry {
  id: string; timestamp: Date; action: string; detail?: string;
  type: "info" | "success" | "warn" | "error";
}
interface ChatMessage {
  id: string; sender: string; text: string; time: Date; self?: boolean;
}
interface QuizQuestion {
  id: string; text: string; options: string[]; correct: number; timeLimit: number;
}
interface QuizResult {
  questionId: string; votes: number[];
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const DEMO_PARTICIPANTS: Participant[] = [
  { id: "u1", name: "Ayşe Kaya",     online: true,  handRaised: true,  muted: false, videoOff: false, speaking: false },
  { id: "u2", name: "Mehmet Demir",  online: true,  handRaised: false, muted: true,  videoOff: false, speaking: false },
  { id: "u3", name: "Zeynep Arslan", online: false, handRaised: false, muted: true,  videoOff: true,  speaking: false },
  { id: "u4", name: "Ali Yılmaz",    online: true,  handRaised: true,  muted: false, videoOff: false, speaking: false },
  { id: "u5", name: "Fatma Şahin",   online: true,  handRaised: false, muted: false, videoOff: true,  speaking: false },
  { id: "u6", name: "Emre Kılıç",    online: true,  handRaised: false, muted: true,  videoOff: false, speaking: false },
];
const DEMO_QUIZ: QuizQuestion[] = [
  { id: "q1", text: "HTTP'de hangi durum kodu 'Bulunamadı' anlamına gelir?", options: ["200","301","404","500"], correct: 2, timeLimit: 30 },
  { id: "q2", text: "JavaScript'te hangi anahtar kelime değişken tanımlamak için kullanılmaz?", options: ["var","let","const","dim"], correct: 3, timeLimit: 20 },
  { id: "q3", text: "Bir üçgenin iç açıları toplamı kaç derecedir?", options: ["90°","180°","270°","360°"], correct: 1, timeLimit: 25 },
];

const DEMO_CHAT: ChatMessage[] = [
  { id: "c1", sender: "Ayşe Kaya",    text: "Hocam soruyu anlayamadım",           time: new Date(Date.now()-180000) },
  { id: "c2", sender: "Mehmet Demir", text: "Ben de aynı soruyu sormak istiyordum", time: new Date(Date.now()-120000) },
  { id: "c3", sender: "Öğretmen",     text: "Şimdi tahtadan açıklıyorum 👍",     time: new Date(Date.now()-60000), self: true },
];
const GRADIENTS = [
  "linear-gradient(135deg,#5B6EFF,#9B59FF)",
  "linear-gradient(135deg,#00B4D8,#5B6EFF)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

/* ─── Icons ──────────────────────────────────────────────────────────────── */
function Ic({ n, s = 16 }: { n: string; s?: number }) {
  const icons: Record<string, React.ReactNode> = {
    mic:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    mic_off:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    video:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    video_off:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    screen:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    record:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>,
    stop:     <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
    users:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    chat:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    hand:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg>,
    send:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    end:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36.54 2 2 0 012.34-1.5H5.5a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.48 8.3"/><line x1="23" y1="1" x2="1" y2="23"/></svg>,
    link:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    poll:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    breakout: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="7" height="7" rx="1"/><rect x="16" y="3" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/><path d="M4.5 10v4h15V10"/><line x1="12" y1="14" x2="12" y2="10"/></svg>,
    clock:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    classroom:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M4 20V6a2 2 0 012-2h12a2 2 0 012 2v14"/><path d="M10 9h4M10 13h4M8 17h8"/></svg>,
    kick:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 11a4 4 0 10-8 0 4 4 0 008 0z"/><path d="M6 21v-1a6 6 0 0112 0v1"/><line x1="18" y1="6" x2="22" y2="10"/><line x1="22" y1="6" x2="18" y2="10"/></svg>,
    spotlight:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>,
    present:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="9 10 12 7 15 10"/></svg>,
    camera:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    board:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M8 10l3 3 5-5"/></svg>,
    plus:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    minus:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    close:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    activity: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    "hand-off":<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-2-2a2 2 0 00-2 2"/><path d="M14 10V4a2 2 0 00-2-2a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/><line x1="2" y1="2" x2="22" y2="22"/></svg>,
    "screen-share":<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2v-3"/><path d="M8 21h8M12 17v4"/><polyline points="17 8 21 4 17 0"/><line x1="21" y1="4" x2="9" y2="4"/></svg>,
    warn:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth={2.5}/><line x1="12" y1="12" x2="12" y2="16"/></svg>,
    signal:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="20" x2="2" y2="16"/><line x1="7" y1="20" x2="7" y2="11"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="17" y1="20" x2="17" y2="2"/></svg>,
    lock:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    unlock:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
    focus:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h5M3 3v5M21 3h-5M21 3v5M3 21h5M3 21v-5M21 21h-5M21 21v-5M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0"/></svg>,
    badge:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    download: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    ghost:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 018 8v9l-3-2-2 2-2-2-2 2-2-2-3 2v-9a8 8 0 018-8z"/></svg>,
    group:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="19" cy="9" r="2"/><path d="M23 21v-1a3 3 0 00-2-2.83"/></svg>,
    file:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  };
  return <>{icons[n] ?? <svg width={s} height={s} viewBox="0 0 24 24"/>}</>;
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${size > 14 ? 2 : 1.5}px solid rgba(255,255,255,0.15)`,
      borderTopColor: "rgba(255,255,255,0.7)",
      animation: "scSpin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function Avatar({ name, online, handRaised, size = 36 }: { name: string; online?: boolean; handRaised?: boolean; size?: number }) {
  const bg = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 800, color: "#fff",
      }}>
        {name[0]?.toUpperCase()}
      </div>
      {online !== undefined && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: size * 0.3, height: size * 0.3, borderRadius: "50%",
          background: online ? "#22c55e" : "rgba(255,255,255,0.15)",
          border: "1.5px solid rgba(6,8,18,0.9)",
        }} />
      )}
      {handRaised && (
        <div style={{
          position: "absolute", top: -2, right: -2,
          width: 14, height: 14, borderRadius: "50%",
          background: "linear-gradient(135deg,#f59e0b,#d97706)",
          border: "1.5px solid rgba(6,8,18,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "scPulse 1.2s ease-in-out infinite",
          fontSize: 7,
        }}>✋</div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function SmartClassroomPage() {
  const t = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [sessionIdInput, setSessionIdInput] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_CHAT);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const [wbPageCount, setWbPageCount] = useState(1);
  const [wbCurrentPage, setWbCurrentPage] = useState(0);
  const [slideStripOpen, setSlideStripOpen] = useState(true);

  const [timerMins, setTimerMins] = useState(5);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);

  const [showBreakoutForm, setShowBreakoutForm] = useState(false);
  const [breakoutCount, setBreakoutCount] = useState(3);

  const [showSettings, setShowSettings] = useState(false);

  const [kickingUser, setKickingUser] = useState<string | null>(null);
  const [spotlightingUser, setSpotlightingUser] = useState<string | null>(null);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  const [rightTab, setRightTab] = useState<"sinif"|"katilimci"|"sohbet"|"quiz">("sinif");

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(DEMO_QUIZ);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [newQuizText, setNewQuizText] = useState("");
  const [newQuizOpts, setNewQuizOpts] = useState(["","","",""]);
  const [newQuizCorrect, setNewQuizCorrect] = useState(0);
  const [newQuizTime, setNewQuizTime] = useState(30);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  type PresenterMode = "board" | "camera" | "both";
  const [presenterMode, setPresenterMode] = useState<PresenterMode>("board");

  const [wbTool, setWbTool] = useState<WhiteboardTool>("pen");
  const [wbColor, setWbColor] = useState("#ffffff");
  const [wbWidth, setWbWidth] = useState(4);
  type WbToolItem = { id: WhiteboardTool; label: string; icon: React.ReactNode };
  const _sv = (ch: React.ReactNode) => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{ch}</svg>;
  const WB_TOOL_GROUPS: WbToolItem[][] = [
    [
      { id: "cursor",      label: t.tr("Seç"),        icon: _sv(<path d="M5 3l14 9-7 1-3 7z"/>) },
      { id: "pan",         label: t.tr("Kaydır"),     icon: _sv(<><path d="M18 11V6a2 2 0 00-2-2a2 2 0 00-2 2"/><path d="M14 10V4a2 2 0 00-2-2a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></>) },
    ],
    [
      { id: "pen",         label: t.tr("Kalem"),      icon: _sv(<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4Z"/>) },
      { id: "highlighter", label: t.tr("Fosforlu"),   icon: _sv(<path d="m9 11-6 6v3h3l6-6m2-13 6 6-10 10"/>) },
      { id: "eraser",      label: t.tr("Silgi"),      icon: _sv(<><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/></>) },
      { id: "laser",       label: t.tr("Lazer"),      icon: _sv(<><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></>) },
    ],
    [
      { id: "line",        label: t.tr("Çizgi"),      icon: _sv(<line x1="5" y1="19" x2="19" y2="5" strokeWidth={2}/>) },
      { id: "arrow",       label: t.tr("Ok"),         icon: _sv(<><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></>) },
      { id: "rect",        label: t.tr("Dikdörtgen"), icon: _sv(<rect x="3" y="3" width="18" height="18" rx="2"/>) },
      { id: "circle",      label: t.tr("Daire"),      icon: _sv(<circle cx="12" cy="12" r="9"/>) },
      { id: "triangle",    label: t.tr("Üçgen"),      icon: _sv(<polygon points="12 3 22 20 2 20"/>) },
      { id: "star",        label: t.tr("Yıldız"),     icon: _sv(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>) },
    ],
    [
      { id: "text",        label: t.tr("Metin"),      icon: _sv(<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>) },
      { id: "note",        label: t.tr("Not"),        icon: _sv(<><path d="M4 4h16v12l-4 4H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></>) },
    ],
  ];
  const WB_COLORS = ["#ffffff","#ef4444","#f59e0b","#22c55e","#3b82f6","#a855f7","#f43f5e","#06b6d4","#000000"];

  const wbRef = useRef<WhiteboardLocalHandle>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Instructor camera & recording
  const [instructorCamOn, setInstructorCamOn] = useState(true);
  const [instructorMicOn, setInstructorMicOn] = useState(true);

  // Board permissions
  const [boardLocked, setBoardLocked] = useState(true); // students read-only by default
  const [studentPermissions, setStudentPermissions] = useState<Record<string, { draw: boolean; file: boolean }>>({});

  // Groups
  const [groups, setGroups] = useState<{ id: string; name: string; color: string; memberIds: string[] }[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Ghost mentor
  const [ghostAlerts, setGhostAlerts] = useState([
    { id: "g1", text: "Sınıfın %40'ı son 2 dakikadır etkileşimsiz", level: "warn" as const },
    { id: "g2", text: "3 öğrenci el kaldırdı, henüz yanıtlanmadı", level: "info" as const },
  ]);
  const [ghostVisible, setGhostVisible] = useState(true);

  // Live cursors (simulated)
  const [liveCursors] = useState([
    { id: "u1", name: "Ayşe K.", x: 25, y: 35, color: "#5B6EFF" },
    { id: "u4", name: "Ali Y.", x: 65, y: 55, color: "#00B4D8" },
  ]);
  const [cursorsVisible, setCursorsVisible] = useState(false);

  // Toolbar tooltip
  const [wbTooltip, setWbTooltip] = useState<string | null>(null);
  const [tooltipY, setTooltipY] = useState(0);

  // Draggable camera PiP
  const [pipPos, setPipPos] = useState({ x: 14, y: -126 }); // bottom-left offset (y negative = from bottom)
  const pipDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  const onPipMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    pipDragRef.current = { startX: e.clientX, startY: e.clientY, origX: pipPos.x, origY: pipPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!pipDragRef.current || !pipRef.current) return;
      const parent = pipRef.current.parentElement!.getBoundingClientRect();
      const dx = ev.clientX - pipDragRef.current.startX;
      const dy = ev.clientY - pipDragRef.current.startY;
      const newX = Math.max(0, Math.min(parent.width - 148, pipDragRef.current.origX + dx));
      const newY = Math.max(-(parent.height - 112), Math.min(-4, pipDragRef.current.origY + dy));
      setPipPos({ x: newX, y: newY });
    };
    const onUp = () => { pipDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Badge drop
  const [badgeDropTarget, setBadgeDropTarget] = useState<string | null>(null);
  const [badgeAnimations, setBadgeAnimations] = useState<{ id: string; x: number; y: number; emoji: string }[]>([]);

  // quiz timer cleanup on unmount
  useEffect(() => () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); }, []);

  useEffect(() => {
    if (session) {
      setSessionDuration(0);
      sessionTimerRef.current = setInterval(() => setSessionDuration(d => d + 1), 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [session?.sessionId]);

  useEffect(() => {
    if (recording) {
      setRecordingSecs(0);
      recordTimerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => { if (recordTimerRef.current) clearInterval(recordTimerRef.current); };
  }, [recording]);

  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecs(prev => {
          if (prev <= 0) {
            if (timerMins <= 0) {
              setTimerActive(false);
              clearInterval(timerIntervalRef.current!);
              addLog(t.tr("Sayaç"), t.tr("Süre doldu"), "warn");
              return 0;
            }
            setTimerMins(m => m - 1);
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timerActive]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const addLog = useCallback((action: string, detail: string, type: LogEntry["type"] = "info") => {
    setLog(prev => [...prev, { id: `${Date.now()}`, timestamp: new Date(), action, detail, type }]);
  }, []);

  const connect = useCallback(async (overrideId?: string) => {
    const sid = (overrideId ?? sessionIdInput).trim();
    if (!sid) return;
    setConnecting(true); setConnectError(null); setIsDemo(false); setLog([]); setSession(null);
    try {
      const data = await apiGet<SessionData>(`/smart-classroom/${sid}`);
      setSession(data);
      addLog(t.tr("Oturuma bağlandı"), `ID: ${sid}`, "success");
    } catch {
      setSession({ sessionId: sid, participants: DEMO_PARTICIPANTS, status: "RUNNING" });
      setIsDemo(true);
      addLog(t.tr("Demo oturuma bağlandı"), `ID: ${sid}`, "warn");
    } finally {
      setConnecting(false);
    }
  }, [sessionIdInput, addLog]);

  const sendControl = useCallback(async (
    action: string, params?: Record<string, unknown>, label?: string, type: LogEntry["type"] = "info"
  ): Promise<boolean> => {
    if (!session) return false;
    try {
      await apiPost(`/smart-classroom/${session.sessionId}/control`, { action, params });
      addLog(label ?? action, params ? JSON.stringify(params) : "", "success");
      return true;
    } catch {
      if (isDemo) { addLog(label ?? action, params ? JSON.stringify(params) : "", type); return true; }
      addLog(`${t.tr("Hata")}: ${label ?? action}`, t.tr("İşlem başarısız"), "error");
      return false;
    }
  }, [session, isDemo, addLog]);

  const handleGlobalAction = useCallback(async (action: string, label: string) => {
    setActionLoading(action);
    await sendControl(action, undefined, label, "success");
    setActionLoading(null);
  }, [sendControl]);

  const handleKick = useCallback(async (userId: string) => {
    setKickingUser(userId);
    const name = session?.participants.find(p => p.id === userId)?.name ?? userId;
    const ok = await sendControl("KICK_USER", { userId }, `${name} ${t.tr("çıkarıldı")}`, "warn");
    if (ok) setSession(s => s ? { ...s, participants: s.participants.filter(p => p.id !== userId) } : s);
    setKickingUser(null);
    setExpandedParticipant(null);
  }, [sendControl, session]);

  const handleSpotlight = useCallback(async (userId: string) => {
    setSpotlightingUser(userId);
    const name = session?.participants.find(p => p.id === userId)?.name ?? userId;
    await sendControl("SPOTLIGHT_USER", { userId }, `${name} ${t.tr("öne çıkarıldı")}`);
    setSpotlightingUser(null);
    setExpandedParticipant(null);
  }, [sendControl, session]);

  const handleCancelHand = useCallback((userId: string) => {
    const name = session?.participants.find(p => p.id === userId)?.name ?? userId;
    sendControl("CANCEL_HAND", { userId }, `${name} ${t.tr("el kaldırması iptal")}`, "info");
    setSession(s => s ? { ...s, participants: s.participants.map(p => p.id === userId ? { ...p, handRaised: false } : p) } : s);
    setExpandedParticipant(null);
  }, [sendControl, session]);

  const handleGiveFloor = useCallback((userId: string) => {
    const p = session?.participants.find(p => p.id === userId);
    if (!p) return;
    const isActive = p.speaking;
    sendControl(isActive ? "REVOKE_FLOOR" : "GIVE_FLOOR", { userId }, `${t.tr(p.name)} ${isActive ? t.tr("söz alındı") : t.tr("söz verildi")}`, isActive ? "warn" : "success");
    setSession(s => s ? { ...s, participants: s.participants.map(q => q.id === userId ? { ...q, speaking: !isActive } : { ...q, speaking: false }) } : s);
    setExpandedParticipant(null);
  }, [sendControl, session]);

  const handleAllowScreen = useCallback((userId: string) => {
    const p = session?.participants.find(p => p.id === userId);
    if (!p) return;
    const isActive = p.screenSharing;
    sendControl(isActive ? "REVOKE_SCREEN" : "ALLOW_SCREEN", { userId }, `${t.tr(p.name)} ${isActive ? t.tr("ekran paylaşım iptal") : t.tr("ekran paylaşım izni")}`, isActive ? "warn" : "success");
    setSession(s => s ? { ...s, participants: s.participants.map(q => q.id === userId ? { ...q, screenSharing: !isActive } : q) } : s);
    setExpandedParticipant(null);
  }, [sendControl, session]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, sender: "Öğretmen",
      text: chatInput.trim(), time: new Date(), self: true,
    }]);
    setChatInput("");
  };

  const getStudentPerm = (id: string) => studentPermissions[id] ?? { draw: false, file: false };

  const toggleStudentPerm = (id: string, perm: "draw" | "file") => {
    setStudentPermissions(prev => {
      const cur = prev[id] ?? { draw: false, file: false };
      const next = { ...cur, [perm]: !cur[perm] };
      sendControl("SET_PERMISSION", { userId: id, [perm]: next[perm] }, `${session?.participants.find(p=>p.id===id)?.name} ${perm} ${next[perm] ? t.tr("izni verildi") : t.tr("iptal")}`);
      return { ...prev, [id]: next };
    });
  };

  const dropBadge = (participantId: string, emoji: string) => {
    const id = `b${Date.now()}`;
    // random position on canvas
    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 60;
    setBadgeAnimations(prev => [...prev, { id, x, y, emoji }]);
    setTimeout(() => setBadgeAnimations(prev => prev.filter(b => b.id !== id)), 2500);
    const name = session?.participants.find(p=>p.id===participantId)?.name ?? participantId;
    addLog(`${t.tr("Rozet")}: ${emoji}`, `${name} ${t.tr("için gönderildi")}`, "success");
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const COLORS = ["#5B6EFF","#00B4D8","#f59e0b","#ef4444","#a855f7","#22c55e"];
    const newGroup = {
      id: `g${Date.now()}`,
      name: newGroupName.trim(),
      color: COLORS[groups.length % COLORS.length],
      memberIds: [],
    };
    setGroups(prev => [...prev, newGroup]);
    setNewGroupName("");
    setShowGroupForm(false);
    addLog(t.tr("Grup oluşturuldu"), newGroup.name, "success");
  };

  const toggleGroupMember = (groupId: string, userId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const has = g.memberIds.includes(userId);
      return { ...g, memberIds: has ? g.memberIds.filter(id => id !== userId) : [...g.memberIds, userId] };
    }));
  };

  const onlineCount = session?.participants.filter(p => p.online).length ?? 0;
  const handCount   = session?.participants.filter(p => p.handRaised).length ?? 0;

  /* ════════════════════════════════════════════════════════════════════════ */
  /* CONNECT SCREEN                                                           */
  /* ════════════════════════════════════════════════════════════════════════ */
  if (!session) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 480, padding: 24 }}>
        <style>{`@keyframes scSpin{to{transform:rotate(360deg)}} @keyframes scPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
        <div style={{
          width: "100%", maxWidth: 480,
          background: "rgba(8,9,22,0.95)",
          border: "1px solid rgba(91,110,255,0.25)",
          borderRadius: 20, padding: "44px 36px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, margin: "0 auto 18px",
              background: "linear-gradient(135deg,#5B6EFF,#00B4D8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 32px rgba(91,110,255,0.4)",
              animation: "scPulse 3s ease-in-out infinite",
            }}>
              <Ic n="classroom" s={32} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "rgba(255,255,255,0.92)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
              {t.live.title}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", margin: 0 }}>
              {t.live.subtitle}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 16px", height: 50,
              borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
            }}>
              <span style={{ color: "rgba(255,255,255,0.3)", display: "flex" }}><Ic n="link" s={15} /></span>
              <input
                value={sessionIdInput}
                onChange={e => setSessionIdInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && connect()}
                placeholder={t.tr("Oturum ID girin…")}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  color: "rgba(255,255,255,0.85)", fontSize: 14, outline: "none",
                }}
              />
            </div>
            <button
              onClick={() => connect()}
              disabled={connecting || !sessionIdInput.trim()}
              style={{
                height: 50, borderRadius: 12, border: "none",
                background: connecting || !sessionIdInput.trim()
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg,#5B6EFF,#00B4D8)",
                color: connecting || !sessionIdInput.trim() ? "rgba(255,255,255,0.3)" : "#fff",
                fontSize: 14, fontWeight: 800, cursor: connecting || !sessionIdInput.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: !connecting && sessionIdInput.trim() ? "0 4px 20px rgba(91,110,255,0.4)" : "none",
              }}
            >
              {connecting ? <><Spinner size={16} />{t.common.loading}</> : <><Ic n="link" s={16}/>{t.live.joinBtn}</>}
            </button>
            {connectError && (
              <p style={{ fontSize: 13, color: "#ef4444", textAlign: "center", margin: 0 }}>{connectError}</p>
            )}
            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              {["demo-cls-001", "demo-cls-002"].map(id => (
                <button key={id} onClick={() => { setSessionIdInput(id); connect(id); }} style={{
                  flex: 1, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: "1px dashed rgba(91,110,255,0.4)",
                  background: "rgba(91,110,255,0.06)", color: "rgba(255,255,255,0.55)", cursor: "pointer",
                }}>{id}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════ */
  /* CLASSROOM                                                                */
  /* ════════════════════════════════════════════════════════════════════════ */
  const classroomEl = (
    <>
      <style>{`
        @keyframes scSpin   { to { transform: rotate(360deg); } }
        @keyframes scPulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse{ 0%,100%{box-shadow:0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 16px rgba(34,197,94,0.6)} }
        @keyframes badgePop{0%{opacity:0;transform:scale(0.3) translateY(20px)}20%{opacity:1;transform:scale(1.2)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.8) translateY(-40px)}}
        .sc-tile:hover .sc-actions { opacity: 1 !important; }
        .sc-tile:hover { border-color: rgba(91,110,255,0.4) !important; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        background: "#060812",
      }}>

        {/* ══ HEADER ═══════════════════════════════════════════════════════ */}
        <header style={{
          height: 50, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
          background: "rgba(6,8,18,0.96)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {/* Left: identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg,#5B6EFF,#00B4D8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(91,110,255,0.35)",
            }}>
              <Ic n="classroom" s={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session.sessionId}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#22c55e", fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "scPulse 1.5s infinite", display: "inline-block" }} />
                  {t.tr("CANLI")}
                </span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{fmt(sessionDuration)}</span>
                {isDemo && <span style={{ color: "#f59e0b", fontWeight: 800, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 99, padding: "0 6px" }}>DEMO</span>}
              </div>
            </div>
          </div>

          {/* Center: stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              <span style={{ color: "#22c55e" }}><Ic n="users" s={12} /></span>
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{onlineCount}</span>
              <span>{t.tr("çevrimiçi")}</span>
            </div>
            {handCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                <span style={{ color: "#f59e0b", animation: "scPulse 1.5s infinite", display: "flex" }}><Ic n="hand" s={12} /></span>
                <span style={{ fontWeight: 800, color: "#f59e0b" }}>{handCount}</span>
                <span>{t.tr("el kaldırdı")}</span>
              </div>
            )}
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "recBlink 1s infinite", display: "inline-block" }} />
                REC {fmt(recordingSecs)}
              </div>
            )}
            {timerActive && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 900,
                color: timerMins === 0 && timerSecs <= 10 ? "#ef4444" : "#f59e0b",
                animation: timerMins === 0 && timerSecs <= 10 ? "recBlink 1s infinite" : "none",
                fontFamily: "monospace",
              }}>
                <Ic n="clock" s={12} />
                {String(timerMins).padStart(2,"0")}:{String(timerSecs).padStart(2,"0")}
              </div>
            )}
          </div>

          {/* Right: presenter mode + log + settings */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Presenter mode */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: 3, gap: 1,
            }}>
              {(["board","both","camera"] as PresenterMode[]).map(m => {
                const cfg = { board: { l: t.tr("Tahta"), i: "board" }, both: { l: t.tr("İkisi"), i: "camera" }, camera: { l: t.tr("Kamera"), i: "camera" } }[m];
                return (
                  <button key={m} onClick={() => setPresenterMode(m)} style={{
                    padding: "4px 8px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: presenterMode === m ? "rgba(91,110,255,0.25)" : "transparent",
                    color: presenterMode === m ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                    fontSize: 10, fontWeight: 700,
                    boxShadow: presenterMode === m ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "none",
                    display: "flex", alignItems: "center", gap: 3, transition: "all 0.15s",
                  }}>
                    <Ic n={cfg.i} s={10} /> {cfg.l}
                  </button>
                );
              })}
            </div>

            {/* Ghost Mentor toggle */}
            <button onClick={() => setGhostVisible(v => !v)} title="Ghost Mentor" style={{
              width: 30, height: 30, borderRadius: 8, border: ghostVisible ? "1px solid rgba(91,110,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
              background: ghostVisible ? "rgba(91,110,255,0.15)" : "transparent",
              color: ghostVisible ? "#a5b4fc" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic n="ghost" s={13} />
            </button>

            {/* Activity log button */}
            <button onClick={() => setShowLog(v => !v)} title={t.tr("Aktivite Günlüğü")} style={{
              width: 30, height: 30, borderRadius: 8, border: showLog ? "1px solid rgba(91,110,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
              background: showLog ? "rgba(91,110,255,0.15)" : "transparent",
              color: showLog ? "#a5b4fc" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <Ic n="activity" s={13} />
              {log.length > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3,
                  width: 14, height: 14, borderRadius: "50%", background: "#5B6EFF",
                  fontSize: 8, fontWeight: 900, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{Math.min(log.length, 99)}</span>
              )}
            </button>

            {/* Settings */}
            <button onClick={() => setShowSettings(v => !v)} title="Ayarlar" style={{
              width: 30, height: 30, borderRadius: 8, border: showSettings ? "1px solid rgba(91,110,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
              background: showSettings ? "rgba(91,110,255,0.15)" : "transparent",
              color: showSettings ? "#a5b4fc" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic n="settings" s={13} />
            </button>
          </div>
        </header>

        {/* ══ MAIN BODY ════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── SLIDE STRIP ───────────────────────────────────────────── */}
          {slideStripOpen ? (
            <div style={{
              width: 78, flexShrink: 0,
              background: "rgba(8,9,20,0.97)",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 6px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Slayt")}</span>
                <button onClick={() => {
                  wbRef.current?.addPage();
                  const total = wbRef.current?.getPageCount() ?? 1;
                  setWbPageCount(total); setWbCurrentPage(total - 1);
                  addLog(t.tr("Tahta"), t.tr("Yeni slayt"), "info");
                }} style={{
                  width: 18, height: 18, borderRadius: 5, border: "none",
                  background: "linear-gradient(135deg,#5B6EFF,#00B4D8)", color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ic n="plus" s={9} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 5, display: "flex", flexDirection: "column", gap: 4 }}>
                {Array.from({ length: wbPageCount }, (_, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <button onClick={() => { wbRef.current?.goToPage(i); setWbCurrentPage(i); }} style={{
                      width: "100%", aspectRatio: "4/3", borderRadius: 7, cursor: "pointer", border: "none",
                      background: wbCurrentPage === i ? "rgba(91,110,255,0.2)" : "rgba(255,255,255,0.04)",
                      boxShadow: wbCurrentPage === i ? "inset 0 0 0 2px rgba(91,110,255,0.6)" : "inset 0 0 0 1px rgba(255,255,255,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: wbCurrentPage === i ? "#a5b4fc" : "rgba(255,255,255,0.2)" }}>{i+1}</span>
                    </button>
                    {wbPageCount > 1 && (
                      <button onClick={() => {
                        wbRef.current?.deletePage(i);
                        const nt = Math.max(1, wbPageCount-1);
                        setWbPageCount(nt); setWbCurrentPage(Math.min(wbCurrentPage, nt-1));
                      }} style={{
                        position: "absolute", top: 2, right: 2, width: 13, height: 13,
                        borderRadius: 4, border: "none", background: "rgba(239,68,68,0.8)",
                        color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setSlideStripOpen(false)} style={{
                padding: "6px", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer",
                fontSize: 9, fontWeight: 700,
              }}>‹ {t.tr("Gizle")}</button>
            </div>
          ) : (
            <button onClick={() => setSlideStripOpen(true)} style={{
              width: 20, flexShrink: 0, border: "none", cursor: "pointer",
              background: "rgba(8,9,20,0.97)", borderRight: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 700,
              writingMode: "vertical-rl", display: "flex", alignItems: "center", justifyContent: "center",
            }}>›</button>
          )}

          {/* ── CANVAS AREA ───────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#0d1117" }}>
            {/* Cross-hatch grid */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }} />
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.065) 1px, transparent 1px)`,
              backgroundSize: "200px 200px",
            }} />

            <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <WhiteboardLocal ref={wbRef} background="transparent" showControls={false} tool={wbTool as any} color={wbColor} width={wbWidth} onToolChange={(t) => setWbTool(t)} />
            </div>

            {/* Toolbar tooltip */}
            {wbTooltip && (
              <div style={{
                position: "fixed", left: 58, top: tooltipY - 2, zIndex: 50,
                background: "rgba(0,0,0,0.88)", color: "#fff",
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                pointerEvents: "none", whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}>{wbTooltip}</div>
            )}

            {/* Vertical drawing toolbar — left edge */}
            <div style={{
              position: "absolute", top: 10, left: 10, bottom: 10, zIndex: 20,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "rgba(8,9,22,0.94)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "6px 5px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              overflowY: "auto",
            }}>
              {/* ── Grouped tools (FIRST — so eraser is always visible) ── */}
              {WB_TOOL_GROUPS.map((group, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />}
                  {group.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => { setWbTool(tool.id); wbRef.current?.setTool(tool.id as any); }}
                      onMouseEnter={e => { setWbTooltip(tool.label); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                      onMouseLeave={() => setWbTooltip(null)}
                      style={{
                        width: 32, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                        background: wbTool === tool.id ? "rgba(91,110,255,0.3)" : "transparent",
                        color: wbTool === tool.id ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                        boxShadow: wbTool === tool.id ? "inset 0 0 0 1px rgba(91,110,255,0.5)" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", flexShrink: 0,
                      }}>{tool.icon}
                    </button>
                  ))}
                </React.Fragment>
              ))}
              {/* ── Active color indicator + Colors ── */}
              <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              <div
                style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: wbColor, border: "2px solid rgba(255,255,255,0.6)", boxShadow: `0 0 0 3px ${wbColor}44`, cursor: "default" }}
                onMouseEnter={e => { setWbTooltip(t.tr("Aktif Renk")); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                onMouseLeave={() => setWbTooltip(null)}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 3, padding: "2px 0" }}>
                {WB_COLORS.map(c => (
                  <button key={c} onClick={() => { setWbColor(c); wbRef.current?.setColor(c); }}
                    onMouseEnter={e => { setWbTooltip(c); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                    onMouseLeave={() => setWbTooltip(null)}
                    style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: wbColor === c ? "2px solid rgba(255,255,255,0.9)" : "1.5px solid rgba(255,255,255,0.15)",
                      background: c, cursor: "pointer", flexShrink: 0,
                      boxShadow: wbColor === c ? `0 0 0 2px ${c}55` : "none",
                      transform: wbColor === c ? "scale(1.18)" : "scale(1)",
                      transition: "all 0.12s",
                    }} />
                ))}
              </div>
              {/* ── Stroke widths ── */}
              <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              {[2,4,8].map(w => (
                <button key={w} onClick={() => { setWbWidth(w); wbRef.current?.setWidth(w); }}
                  onMouseEnter={e => { setWbTooltip(`${t.tr("Çizgi")}: ${w}px`); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                  onMouseLeave={() => setWbTooltip(null)}
                  style={{
                    width: 32, height: 20, borderRadius: 6,
                    border: wbWidth === w ? "1px solid rgba(91,110,255,0.5)" : "1px solid rgba(255,255,255,0.07)",
                    background: wbWidth === w ? "rgba(91,110,255,0.15)" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                  <div style={{ width: 14, height: Math.max(w * 0.7, 1.5), borderRadius: 99, background: wbWidth === w ? "#a5b4fc" : "rgba(255,255,255,0.35)" }} />
                </button>
              ))}
              {/* ── Undo / Redo / Clear ── */}
              <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              {([
                { key: "geri-al",   label: t.tr("Geri Al"), icon: "↩", onClick: () => wbRef.current?.undo(), style: { border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.45)" } },
                { key: "yinele",    label: t.tr("Yinele"),  icon: "↪", onClick: () => wbRef.current?.redo(), style: { border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.45)" } },
                { key: "temizle",   label: t.tr("Tahtayı Temizle"), icon: "✕", onClick: () => wbRef.current?.clear(), style: { border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#f87171" } },
              ]).map(btn => (
                <button key={btn.key} onClick={btn.onClick}
                  onMouseEnter={e => { setWbTooltip(btn.label); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                  onMouseLeave={() => setWbTooltip(null)}
                  style={{ width: 32, height: 26, borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...btn.style }}>{btn.icon}
                </button>
              ))}
              {/* ── Calculator & Image ── */}
              <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              {([
                { key: "hesap", label: t.tr("Hesap Makinesi"), icon: "🧮", onClick: () => wbRef.current?.openCalculator(), border: "1px solid rgba(0,180,216,0.25)", bg: "rgba(0,180,216,0.07)", color: "#67e8f9" },
                { key: "gorsel", label: t.tr("Görsel Ekle"), icon: "🖼", onClick: () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) wbRef.current?.addImageFromFile(f); }; inp.click(); }, border: "1px solid rgba(91,110,255,0.25)", bg: "rgba(91,110,255,0.07)", color: "#a5b4fc" },
              ]).map(btn => (
                <button key={btn.key} onClick={btn.onClick}
                  onMouseEnter={e => { setWbTooltip(btn.label); setTooltipY(e.currentTarget.getBoundingClientRect().top + 7); }}
                  onMouseLeave={() => setWbTooltip(null)}
                  style={{ width: 32, height: 26, borderRadius: 7, border: btn.border, background: btn.bg, color: btn.color, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{btn.icon}
                </button>
              ))}
            </div>

            {/* Camera-only overlay */}
            {presenterMode === "camera" && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 8,
                background: "#080A17",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <div style={{
                  width: 180, height: 135, borderRadius: 16,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  color: "rgba(255,255,255,0.3)",
                }}>
                  <Ic n="camera" s={36} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{t.tr("Kamera Akışı")}</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{t.tr("Öğrenciler kameranızı görüyor")}</span>
              </div>
            )}

            {/* Camera PiP — draggable */}
            {presenterMode === "both" && instructorCamOn && (
              <div
                ref={pipRef}
                onMouseDown={onPipMouseDown}
                style={{
                  position: "absolute",
                  left: pipPos.x,
                  bottom: -pipPos.y,
                  zIndex: 8,
                  width: 148, height: 112, borderRadius: 12,
                  background: "linear-gradient(135deg,#0a0f1e,#050810)",
                  border: "1.5px solid rgba(91,110,255,0.3)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  color: "rgba(255,255,255,0.35)",
                  cursor: "grab",
                  userSelect: "none",
                  transition: "box-shadow 0.15s",
                }}>
                <Ic n="camera" s={22} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>{t.tr("Kameranız")}</span>
                <div style={{
                  position: "absolute", top: 5, right: 5,
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <span style={{ fontSize: 7, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>{t.tr("CANLI")}</span>
                </div>
                <div style={{
                  position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                  fontSize: 8, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "0.05em",
                }}>{t.tr("⠿ Sürükle")}</div>
              </div>
            )}

            {/* Slide indicator */}
            <div style={{
              position: "absolute", bottom: 12, right: 12, zIndex: 5,
              background: "rgba(6,8,18,0.82)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 600,
              color: "rgba(255,255,255,0.45)",
              backdropFilter: "blur(12px)",
            }}>
              {t.tr("Slayt")} {wbCurrentPage + 1} / {wbPageCount}
            </div>

            {/* Ghost Mentor Panel */}
            {ghostVisible && ghostAlerts.length > 0 && (
              <div style={{
                position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 15,
                background: "rgba(8,9,22,0.95)", border: "1px solid rgba(91,110,255,0.35)",
                borderRadius: 12, padding: "8px 12px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                maxWidth: 340, width: "90%",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: "#a5b4fc", display: "flex" }}><Ic n="ghost" s={12} /></span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ghost Mentor</span>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{t.tr("— Sadece size görünür")}</span>
                  </div>
                  <button onClick={() => setGhostVisible(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
                {ghostAlerts.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4, padding: "5px 7px", borderRadius: 7, background: a.level === "warn" ? "rgba(245,158,11,0.08)" : "rgba(91,110,255,0.06)", border: `1px solid ${a.level === "warn" ? "rgba(245,158,11,0.2)" : "rgba(91,110,255,0.15)"}` }}>
                    <span style={{ fontSize: 11, flexShrink: 0 }}>{a.level === "warn" ? "⚠️" : "ℹ️"}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{t.tr(a.text)}</span>
                    <button onClick={() => setGhostAlerts(prev => prev.filter(x => x.id !== a.id))} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 12, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Live cursors overlay */}
            {cursorsVisible && liveCursors.map(cur => (
              <div key={cur.id} style={{
                position: "absolute",
                left: `${cur.x}%`,
                top: `${cur.y}%`,
                zIndex: 12,
                pointerEvents: "none",
                transform: "translate(-4px, -4px)",
              }}>
                <svg width={16} height={16} viewBox="0 0 16 16">
                  <path d="M2 2l12 6-6 2-2 6z" fill={cur.color} stroke="#fff" strokeWidth={0.5}/>
                </svg>
                <span style={{
                  position: "absolute", left: 14, top: 0,
                  background: cur.color, color: "#fff",
                  fontSize: 9, fontWeight: 700,
                  padding: "1px 5px", borderRadius: 4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}>{t.tr(cur.name)}</span>
              </div>
            ))}

            {/* Badge animations */}
            {badgeAnimations.map(b => (
              <div key={b.id} style={{
                position: "absolute",
                left: `${b.x}%`,
                top: `${b.y}%`,
                zIndex: 25,
                fontSize: 36,
                pointerEvents: "none",
                animation: "badgePop 2.5s ease forwards",
              }}>{b.emoji}</div>
            ))}
          </div>

          {/* ── RIGHT PANEL (tabbed) ──────────────────────────────────── */}
          <div style={{
            width: 300, flexShrink: 0,
            background: "rgba(8,9,20,0.97)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Tab bar */}
            <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,8,18,0.8)" }}>
              {([
                { id: "sinif" as const,      label: t.tr("Sınıf"),     badge: onlineCount },
                { id: "katilimci" as const,  label: t.tr("Üyeler"),    badge: handCount },
                { id: "sohbet" as const,     label: t.tr("Sohbet"),    badge: messages.length },
                { id: "quiz" as const,       label: t.tr("Quiz"),      badge: quizQuestions.length },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                  flex: 1, padding: "9px 2px 7px", border: "none", cursor: "pointer",
                  background: "transparent", fontSize: 9, fontWeight: 800,
                  color: rightTab === tab.id ? "#a5b4fc" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  borderBottom: rightTab === tab.id ? "2px solid #5B6EFF" : "2px solid transparent",
                  position: "relative", transition: "all 0.15s",
                }}>
                  {tab.label}
                  {tab.badge > 0 && (
                    <span style={{
                      position: "absolute", top: 4, right: 6,
                      minWidth: 13, height: 13, borderRadius: 99, padding: "0 2px",
                      background: tab.id === "katilimci" && handCount > 0 ? "#f59e0b" : "rgba(91,110,255,0.8)",
                      fontSize: 7, fontWeight: 900, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{Math.min(tab.badge, 99)}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══ SINIF TAB ══════════════════════════════════════════ */}
            {rightTab === "sinif" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, alignContent: "start" }}>
                {/* Instructor tile */}
                <div style={{
                  position: "relative", borderRadius: 10, overflow: "hidden",
                  background: instructorCamOn ? "rgba(91,110,255,0.08)" : "#0a0b18",
                  border: "2px solid rgba(91,110,255,0.5)",
                  aspectRatio: "16/9",
                }}>
                  <div style={{ width: "100%", height: "100%", minHeight: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    {instructorCamOn
                      ? <><Ic n="camera" s={20} /><span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{t.tr("Kameranız Açık")}</span></>
                      : <><Ic n="video_off" s={20} /><span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{t.tr("Kamera Kapalı")}</span></>
                    }
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#a5b4fc" }}>{t.tr("👨‍🏫 Eğitmen (Ben)")}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => setInstructorMicOn(v => !v)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: instructorMicOn ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", color: instructorMicOn ? "#4ade80" : "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Ic n={instructorMicOn ? "mic" : "mic_off"} s={9} />
                      </button>
                      <button onClick={() => setInstructorCamOn(v => !v)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: instructorCamOn ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", color: instructorCamOn ? "#4ade80" : "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Ic n={instructorCamOn ? "video" : "video_off"} s={9} />
                      </button>
                    </div>
                  </div>
                </div>
                {session.participants.map(p => (
                  <div key={p.id} className="sc-tile" onClick={() => setExpandedParticipant(v => v === p.id ? null : p.id)} style={{
                    position: "relative", borderRadius: 10, cursor: "pointer", aspectRatio: "4/3",
                    background: p.speaking ? "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.05))" : p.online ? "rgba(13,15,30,0.9)" : "rgba(8,9,20,0.6)",
                    border: p.speaking ? "1.5px solid rgba(34,197,94,0.6)" : p.handRaised ? "1.5px solid rgba(245,158,11,0.55)" : p.online ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.03)",
                    boxShadow: p.speaking ? "0 0 14px rgba(34,197,94,0.25)" : "none",
                    overflow: "hidden", filter: p.online ? "none" : "grayscale(1) opacity(0.35)",
                    transition: "all 0.18s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    {p.handRaised && <div style={{ position: "absolute", top: 4, right: 4, zIndex: 2, width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, animation: "scPulse 1.2s ease-in-out infinite" }}>✋</div>}
                    {p.speaking && <div style={{ position: "absolute", top: 4, left: 4, zIndex: 2, fontSize: 7, fontWeight: 900, color: "#22c55e", background: "rgba(34,197,94,0.18)", borderRadius: 99, padding: "1px 5px", border: "1px solid rgba(34,197,94,0.4)" }}>{t.tr("KONUŞUYOR")}</div>}
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: GRADIENTS[p.name.charCodeAt(0) % GRADIENTS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", boxShadow: p.speaking ? "0 0 0 2px rgba(34,197,94,0.5)" : "none" }}>{p.name[0]?.toUpperCase()}</div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 6px", background: "linear-gradient(to top,rgba(6,8,18,0.9),transparent)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{p.name.split(" ")[0]}</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {p.muted && <span style={{ color: "rgba(239,68,68,0.7)", display: "flex" }}><Ic n="mic_off" s={8} /></span>}
                        {p.videoOff && <span style={{ color: "rgba(255,255,255,0.3)", display: "flex" }}><Ic n="video_off" s={8} /></span>}
                      </div>
                    </div>
                    {expandedParticipant === p.id && (
                      <div className="sc-actions" style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(6,8,18,0.92)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 3, padding: 5, alignItems: "stretch", animation: "fadeUp 0.15s ease both" }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 2 }}>{p.name.split(" ")[0]}</span>
                        {p.handRaised && <TileAction color="#f59e0b" label={t.tr("El İptal")} onClick={() => handleCancelHand(p.id)} />}
                        <TileAction color={p.speaking ? "#ef4444" : "#22c55e"} label={p.speaking ? t.tr("Söz Al") : t.tr("Söz Ver")} onClick={() => handleGiveFloor(p.id)} />
                        <TileAction color={p.screenSharing ? "#ef4444" : "#f59e0b"} label={p.screenSharing ? t.tr("Ekran İptal") : t.tr("Ekran İzni")} onClick={() => handleAllowScreen(p.id)} />
                        <TileAction color="#5B6EFF" label={spotlightingUser === p.id ? "…" : t.tr("Öne Çıkar")} onClick={() => handleSpotlight(p.id)} />
                        <TileAction color="#ef4444" label={kickingUser === p.id ? "…" : t.tr("Çıkar")} onClick={() => handleKick(p.id)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ═══ KATILIMCIlar TAB ═══════════════════════════════════ */}
            {rightTab === "katilimci" && (
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 5, padding: "8px 8px 4px", flexShrink: 0 }}>
                  <button onClick={() => handleGlobalAction("MUTE_ALL", t.tr("Tümünü Sessiz"))} style={{ flex: 1, padding: "6px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🔇 {t.tr("Herkesi Sessiz")}</button>
                  <button onClick={() => { sendControl("RAISE_HAND_RESET", undefined, t.tr("El kaldırmalar sıfırlandı")); setSession(s => s ? { ...s, participants: s.participants.map(p => ({ ...p, handRaised: false })) } : s); }} style={{ flex: 1, padding: "6px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{t.tr("✋ Elleri İndir")}</button>
                </div>
                {session.participants.map(p => (
                  <div key={p.id} style={{ display: "flex", flexDirection: "column", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={t.tr(p.name)} online={p.online} handRaised={p.handRaised} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: p.online ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tr(p.name)}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                          {p.speaking && <span style={{ fontSize: 8, fontWeight: 800, color: "#22c55e", background: "rgba(34,197,94,0.12)", borderRadius: 99, padding: "1px 5px" }}>{t.tr("Konuşuyor")}</span>}
                          {p.muted && <span style={{ fontSize: 8, color: "rgba(239,68,68,0.6)", display: "flex", alignItems: "center", gap: 2 }}><Ic n="mic_off" s={8} />Sessiz</span>}
                          {p.videoOff && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 2 }}><Ic n="video_off" s={8} />{t.tr("Kamera kapalı")}</span>}
                          {!p.online && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{t.tr("Çevrimdışı")}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        <button onClick={() => handleGiveFloor(p.id)} title={p.speaking ? t.tr("Söz Al") : t.tr("Söz Ver")} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.speaking ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}`, background: p.speaking ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)", color: p.speaking ? "#f87171" : "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="mic" s={11} /></button>
                        <button onClick={() => handleAllowScreen(p.id)} title={p.screenSharing ? t.tr("Ekran İptal") : t.tr("Ekran İzni")} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.screenSharing ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`, background: p.screenSharing ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)", color: p.screenSharing ? "#f87171" : "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="screen-share" s={11} /></button>
                        <button onClick={() => handleSpotlight(p.id)} title={t.tr("Öne Çıkar")} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid rgba(91,110,255,0.3)", background: "rgba(91,110,255,0.08)", color: "#a5b4fc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="spotlight" s={11} /></button>
                        <button onClick={() => setSession(s => s ? { ...s, participants: s.participants.map(q => q.id === p.id ? { ...q, videoOff: !q.videoOff } : q) } : s)} title={p.videoOff ? t.tr("Kamerayı Aç") : t.tr("Kamerayı Kapat")} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${p.videoOff ? "rgba(255,255,255,0.1)" : "rgba(34,197,94,0.3)"}`, background: p.videoOff ? "rgba(255,255,255,0.04)" : "rgba(34,197,94,0.08)", color: p.videoOff ? "rgba(255,255,255,0.3)" : "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={p.videoOff ? "video_off" : "video"} s={11} /></button>
                        <button onClick={() => toggleStudentPerm(p.id, "draw")} title={getStudentPerm(p.id).draw ? t.tr("Çizim yetkisini kaldır") : t.tr("Çizim yetkisi ver")} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${getStudentPerm(p.id).draw ? "rgba(0,180,216,0.4)" : "rgba(255,255,255,0.08)"}`, background: getStudentPerm(p.id).draw ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.03)", color: getStudentPerm(p.id).draw ? "#67e8f9" : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="board" s={11} /></button>
                        <button onClick={() => toggleStudentPerm(p.id, "file")} title={getStudentPerm(p.id).file ? t.tr("Dosya iznini kaldır") : t.tr("Dosya paylaşım izni")} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${getStudentPerm(p.id).file ? "rgba(0,180,216,0.4)" : "rgba(255,255,255,0.08)"}`, background: getStudentPerm(p.id).file ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.03)", color: getStudentPerm(p.id).file ? "#67e8f9" : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="file" s={11} /></button>
                        <button onClick={() => handleKick(p.id)} title={t.tr("Çıkar")} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="kick" s={11} /></button>
                      </div>
                    </div>
                    {/* Badge drop */}
                    <div style={{ display: "flex", gap: 3, marginTop: 4, paddingLeft: 38 }}>
                      {["⭐","🏆","💡","🎯","👏"].map(emoji => (
                        <button key={emoji} onClick={() => dropBadge(p.id, emoji)} title={`${emoji} rozeti gönder`} style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{emoji}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Groups section */}
                <div style={{ padding: "10px 10px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.tr("Çalışma Grupları")} ({groups.length})</span>
                    <button onClick={() => setShowGroupForm(v => !v)} style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(91,110,255,0.2)", color: "#a5b4fc", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>+</button>
                  </div>
                  {showGroupForm && (
                    <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                      <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && createGroup()} placeholder={t.tr("Grup adı…")} style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)", fontSize: 11, outline: "none" }} />
                      <button onClick={createGroup} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "rgba(91,110,255,0.25)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{t.tr("Oluştur")}</button>
                    </div>
                  )}
                  {groups.map(g => (
                    <div key={g.id} style={{ marginBottom: 6, padding: "8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${g.color}33` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{t.tr(g.name)}</span>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>({g.memberIds.length} {t.tr("üye")})</span>
                        </div>
                        <button onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {session?.participants.filter(p => p.online).map(p => (
                          <button key={p.id} onClick={() => toggleGroupMember(g.id, p.id)} style={{
                            padding: "2px 7px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700,
                            background: g.memberIds.includes(p.id) ? g.color + "33" : "rgba(255,255,255,0.04)",
                            color: g.memberIds.includes(p.id) ? g.color : "rgba(255,255,255,0.35)",
                            boxShadow: g.memberIds.includes(p.id) ? `inset 0 0 0 1px ${g.color}55` : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                          }}>{g.memberIds.includes(p.id) ? "✓ " : ""}{p.name.split(" ")[0]}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "8px 0" }}>{t.tr("Henüz grup yok. + ile oluştur.")}</p>
                  )}
                </div>
              </div>
            )}

            {/* ═══ SOHBET TAB ══════════════════════════════════════════ */}
            {rightTab === "sohbet" && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.self ? "flex-end" : "flex-start", animation: "fadeUp 0.2s ease both" }}>
                      {!msg.self && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <Avatar name={msg.sender} size={16} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{msg.sender}</span>
                        </div>
                      )}
                      <div style={{ maxWidth: "85%", padding: "7px 10px", borderRadius: msg.self ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: msg.self ? "linear-gradient(135deg,#5B6EFF,#00B4D8)" : "rgba(255,255,255,0.06)", border: msg.self ? "none" : "1px solid rgba(255,255,255,0.06)", color: msg.self ? "#fff" : "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.5, boxShadow: msg.self ? "0 2px 12px rgba(91,110,255,0.3)" : "none" }}>{t.tr(msg.text)}</div>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{msg.time.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 6, flexShrink: 0 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder={t.tr("Mesaj yaz…")} style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                  <button onClick={sendChat} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#5B6EFF,#00B4D8)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(91,110,255,0.35)", flexShrink: 0 }}><Ic n="send" s={13} /></button>
                </div>
              </>
            )}

            {/* ═══ QUIZ TAB ════════════════════════════════════════════ */}
            {rightTab === "quiz" && (
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

                {/* Active quiz result bar */}
                {activeQuiz && (
                  <div style={{ margin: "8px", padding: "10px", borderRadius: 10, background: "rgba(91,110,255,0.1)", border: "1px solid rgba(91,110,255,0.3)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.tr("Aktif Soru")}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: quizTimeLeft <= 5 ? "#ef4444" : "#f59e0b", animation: quizTimeLeft <= 5 ? "recBlink 1s infinite" : "none" }}>{quizTimeLeft}s</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 8, lineHeight: 1.4 }}>{t.tr(activeQuiz.text)}</div>
                    {activeQuiz.options.map((opt, i) => {
                      const total = quizResults.find(r => r.questionId === activeQuiz.id)?.votes.reduce((a,b) => a+b, 0) ?? 0;
                      const votes = quizResults.find(r => r.questionId === activeQuiz.id)?.votes[i] ?? 0;
                      const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                      return (
                        <div key={i} style={{ marginBottom: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                            <span style={{ color: i === activeQuiz.correct ? "#4ade80" : "rgba(255,255,255,0.6)", fontWeight: i === activeQuiz.correct ? 800 : 500 }}>{i === activeQuiz.correct ? "✓ " : ""}{opt}</span>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{votes} ({pct}%)</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: i === activeQuiz.correct ? "rgba(74,222,128,0.5)" : "rgba(91,110,255,0.45)", transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => { setActiveQuiz(null); if (quizTimerRef.current) clearInterval(quizTimerRef.current); }} style={{ marginTop: 8, width: "100%", padding: "7px", borderRadius: 7, border: "none", background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{t.tr("Soruyu Bitir")}</button>
                  </div>
                )}

                {/* Question bank */}
                <div style={{ padding: "6px 8px 0", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{t.tr("Soru Bankası")} ({quizQuestions.length})</div>
                  {quizQuestions.map((q, qi) => (
                    <div key={q.id} style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: activeQuiz?.id === q.id ? "1px solid rgba(91,110,255,0.5)" : "1px solid rgba(255,255,255,0.06)", marginBottom: 5 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 5, lineHeight: 1.4 }}>{qi+1}. {t.tr(q.text)}</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
                        {q.options.map((opt, i) => (
                          <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: i === q.correct ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)", border: i === q.correct ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.06)", color: i === q.correct ? "#4ade80" : "rgba(255,255,255,0.4)" }}>{i === q.correct ? "✓ " : ""}{opt}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>⏱ {q.timeLimit}s</span>
                        <button onClick={() => {
                          if (!activeQuiz) {
                            setActiveQuiz(q);
                            setQuizTimeLeft(q.timeLimit);
                            setQuizResults(prev => [...prev.filter(r => r.questionId !== q.id), { questionId: q.id, votes: q.options.map(() => Math.floor(Math.random() * onlineCount + 1)) }]);
                            sendControl("QUIZ_LAUNCH", { questionId: q.id, question: q.text, options: q.options }, `${t.tr("Soru gönderildi")}: ${q.text.substring(0,30)}`, "success");
                            if (quizTimerRef.current) clearInterval(quizTimerRef.current);
                            quizTimerRef.current = setInterval(() => {
                              setQuizTimeLeft(prev => { if (prev <= 1) { clearInterval(quizTimerRef.current!); setActiveQuiz(null); addLog("Quiz", t.tr("Süre doldu"), "warn"); return 0; } return prev - 1; });
                            }, 1000);
                          }
                        }} disabled={!!activeQuiz} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "none", background: activeQuiz ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#5B6EFF,#00B4D8)", color: activeQuiz ? "rgba(255,255,255,0.2)" : "#fff", fontSize: 9, fontWeight: 800, cursor: activeQuiz ? "not-allowed" : "pointer" }}>{t.tr("▶ Gönder")}</button>
                        <button onClick={() => setQuizQuestions(prev => prev.filter(qq => qq.id !== q.id))} style={{ width: 20, height: 20, borderRadius: 5, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="close" s={9} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create new question */}
                <div style={{ margin: "0 8px 8px", padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>+ {t.tr("Yeni Soru")}</div>
                  <input value={newQuizText} onChange={e => setNewQuizText(e.target.value)} placeholder={t.tr("Soru metnini girin…")} style={{ ...modalInputStyle, marginBottom: 6, fontSize: 11 }} />
                  {newQuizOpts.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                      <button onClick={() => setNewQuizCorrect(i)} title={t.tr("Doğru cevap")} style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${newQuizCorrect === i ? "#4ade80" : "rgba(255,255,255,0.15)"}`, background: newQuizCorrect === i ? "rgba(34,197,94,0.2)" : "transparent", cursor: "pointer", flexShrink: 0 }} />
                      <input value={opt} onChange={e => setNewQuizOpts(prev => prev.map((p2,idx) => idx === i ? e.target.value : p2))} placeholder={`${t.tr("Seçenek")} ${i+1}${i === newQuizCorrect ? " ✓" : ""}`} style={{ ...modalInputStyle, flex: 1, fontSize: 11, padding: "5px 8px" }} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{t.tr("Süre:")}</span>
                    {[15,30,60].map(t => (
                      <button key={t} onClick={() => setNewQuizTime(t)} style={{ padding: "3px 8px", borderRadius: 6, border: newQuizTime === t ? "1px solid rgba(91,110,255,0.5)" : "1px solid rgba(255,255,255,0.08)", background: newQuizTime === t ? "rgba(91,110,255,0.15)" : "rgba(255,255,255,0.04)", color: newQuizTime === t ? "#a5b4fc" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{t}s</button>
                    ))}
                    <button onClick={() => {
                      const filled = newQuizOpts.filter(o => o.trim());
                      if (!newQuizText.trim() || filled.length < 2) return;
                      const newQ: QuizQuestion = { id: `q${Date.now()}`, text: newQuizText.trim(), options: newQuizOpts.filter(o => o.trim()), correct: Math.min(newQuizCorrect, filled.length - 1), timeLimit: newQuizTime };
                      setQuizQuestions(prev => [...prev, newQ]);
                      setNewQuizText(""); setNewQuizOpts(["","","",""]); setNewQuizCorrect(0);
                      addLog(t.tr("Soru oluşturuldu"), newQ.text.substring(0,40), "success");
                    }} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#5B6EFF,#00B4D8)", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>{t.tr("Ekle")}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* ══ BOTTOM CONTROL BAR ══════════════════════════════════════════ */}
          <div style={{
            height: 54, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px",
            background: "rgba(6,8,18,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            {/* Left: instructor A/V controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setInstructorMicOn(v => !v)}
                title={instructorMicOn ? t.tr("Mikrofonu Kapat") : t.tr("Mikrofonu Aç")}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                  background: instructorMicOn ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: instructorMicOn ? "#4ade80" : "#f87171",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: instructorMicOn ? "inset 0 0 0 1px rgba(34,197,94,0.3)" : "inset 0 0 0 1px rgba(239,68,68,0.3)",
                  transition: "all 0.15s",
                }}
              >
                <Ic n={instructorMicOn ? "mic" : "mic_off"} s={16} />
              </button>
              <button
                onClick={() => setInstructorCamOn(v => !v)}
                title={instructorCamOn ? t.tr("Kamerayı Kapat") : t.tr("Kamerayı Aç")}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                  background: instructorCamOn ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: instructorCamOn ? "#4ade80" : "#f87171",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: instructorCamOn ? "inset 0 0 0 1px rgba(34,197,94,0.3)" : "inset 0 0 0 1px rgba(239,68,68,0.3)",
                  transition: "all 0.15s",
                }}
              >
                <Ic n={instructorCamOn ? "video" : "video_off"} s={16} />
              </button>
              <button
                onClick={() => { setRecording(v => !v); addLog(t.tr("Kayıt"), recording ? t.tr("Durduruldu") : t.tr("Başlatıldı"), recording ? "warn" : "success"); }}
                title={recording ? t.tr("Kaydı Durdur") : t.tr("Kayıt Başlat")}
                style={{
                  height: 38, padding: "0 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: recording ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                  color: recording ? "#f87171" : "rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: recording ? "inset 0 0 0 1px rgba(239,68,68,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                  fontSize: 11, fontWeight: 800, transition: "all 0.15s",
                }}
              >
                {recording
                  ? <><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f87171" }} />{fmt(recordingSecs)}</>
                  : <><Ic n="record" s={14} />{t.tr("Kayıt")}</>
                }
              </button>
            </div>

            {/* Center: classroom controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => { setBoardLocked(v => !v); sendControl(boardLocked ? "BOARD_UNLOCK" : "BOARD_LOCK", undefined, boardLocked ? t.tr("Tahta kilidini kaldır") : t.tr("Tahta kilitlendi")); }}
                title={boardLocked ? t.tr("Tahtayı Aç (öğrenciler çizebilir)") : t.tr("Tahtayı Kilitle (salt okunur)")}
                style={{
                  height: 36, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: boardLocked ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.1)",
                  color: boardLocked ? "#fbbf24" : "#4ade80",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: boardLocked ? "inset 0 0 0 1px rgba(245,158,11,0.3)" : "inset 0 0 0 1px rgba(34,197,94,0.3)",
                  fontSize: 10, fontWeight: 800,
                }}
              >
                <Ic n={boardLocked ? "lock" : "unlock"} s={12} />
                {boardLocked ? t.tr("Tahta Kilitli") : t.tr("Tahta Açık")}
              </button>
              <button
                onClick={() => { setCursorsVisible(v => !v); }}
                title={t.tr("Canlı İmleçleri Göster/Gizle")}
                style={{
                  height: 36, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: cursorsVisible ? "rgba(91,110,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: cursorsVisible ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: cursorsVisible ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.07)",
                  fontSize: 10, fontWeight: 800,
                }}
              >
                <Ic n="users" s={12} />
                {t.tr("İmleçler")}
              </button>
              <button
                onClick={() => { handleGlobalAction("FORCE_VIEW", t.tr("Herkesi bana odakla")); }}
                title={t.tr("Tüm öğrencilerin görünümünü sana kilitle")}
                style={{
                  height: 36, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: "rgba(0,180,216,0.1)",
                  color: "#67e8f9",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "inset 0 0 0 1px rgba(0,180,216,0.25)",
                  fontSize: 10, fontWeight: 800,
                }}
              >
                <Ic n="focus" s={12} />
                {t.tr("Odakla")}
              </button>
            </div>

            {/* Right: end session */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => wbRef.current?.download()}
                title={t.tr("Tahtayı İndir")}
                style={{
                  height: 36, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.4)",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
                  fontSize: 10, fontWeight: 800,
                }}
              >
                <Ic n="download" s={12} />
                {t.tr("İndir")}
              </button>
              <button
                onClick={() => setSession(null)}
                style={{
                  height: 36, padding: "0 16px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.3)",
                  fontSize: 11, fontWeight: 800,
                }}
              >
                <Ic n="end" s={14} />
                {t.tr("Dersi Bitir")}
              </button>
            </div>
          </div>

        {/* ══ OVERLAYS ══════════════════════════════════════════════════════ */}

        {/* Poll modal */}
        {showPollForm && (
          <Modal title={t.tr("Anket Başlat")} accent="#5B6EFF" onClose={() => setShowPollForm(false)}>
            <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder={t.tr("Soru…")} style={modalInputStyle} />
            {pollOptions.map((o, i) => (
              <input key={i} value={o}
                onChange={e => setPollOptions(prev => prev.map((p2,idx) => idx === i ? e.target.value : p2))}
                placeholder={`${t.tr("Seçenek")} ${i+1}`} style={{ ...modalInputStyle, marginTop: 6 }} />
            ))}
            <button onClick={() => {
              const filled = pollOptions.filter(o => o.trim());
              if (!pollQuestion.trim() || filled.length < 2) return;
              sendControl("POLL_START", { question: pollQuestion, options: filled }, `${t.tr("Anket")}: ${pollQuestion}`);
              setShowPollForm(false); setPollQuestion(""); setPollOptions(["","","",""]);
            }} style={{ ...modalBtnStyle, marginTop: 10 }}>{t.tr("Anketi Gönder")}</button>
          </Modal>
        )}

        {/* Breakout modal */}
        {showBreakoutForm && (
          <Modal title={t.tr("Breakout Grupları")} accent="#00B4D8" onClose={() => setShowBreakoutForm(false)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
              <button onClick={() => setBreakoutCount(c => Math.max(2,c-1))} style={modalCounterBtn}>−</button>
              <span style={{ fontSize: 28, fontWeight: 900, color: "rgba(255,255,255,0.85)", minWidth: 40, textAlign: "center" }}>{breakoutCount}</span>
              <button onClick={() => setBreakoutCount(c => Math.min(10,c+1))} style={modalCounterBtn}>+</button>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t.tr("grup")}</span>
            </div>
            <button onClick={() => {
              sendControl("BREAKOUT_CREATE", { groupCount: breakoutCount }, `${breakoutCount} ${t.tr("breakout grubu")}`, "success");
              setShowBreakoutForm(false);
            }} style={{ ...modalBtnStyle, background: "linear-gradient(135deg,#00B4D8,#0891b2)" }}>{t.tr("Grupları Oluştur")}</button>
          </Modal>
        )}

        {/* Timer panel */}
        {showTimer && (
          <Modal title={t.tr("Sayaç")} accent="#f59e0b" onClose={() => setShowTimer(false)}>
            <div style={{
              textAlign: "center", fontSize: 44, fontWeight: 900, letterSpacing: "0.06em",
              fontFamily: "monospace", marginBottom: 12,
              color: timerActive && timerMins === 0 && timerSecs <= 10 ? "#ef4444" : "rgba(255,255,255,0.9)",
              animation: timerActive && timerMins === 0 && timerSecs <= 10 ? "recBlink 1s infinite" : "none",
            }}>
              {String(timerMins).padStart(2,"0")}:{String(timerSecs).padStart(2,"0")}
            </div>
            {!timerActive && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
                {[1,3,5,10].map(m => (
                  <button key={m} onClick={() => { setTimerMins(m); setTimerSecs(0); }} style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    border: timerMins === m && timerSecs === 0 ? "1.5px solid rgba(245,158,11,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    background: timerMins === m && timerSecs === 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                    color: timerMins === m && timerSecs === 0 ? "#f59e0b" : "rgba(255,255,255,0.5)",
                  }}>{m}{t.tr("dk")}</button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTimerActive(a => !a)} style={{ ...modalBtnStyle, flex: 1, background: timerActive ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                {timerActive ? t.tr("Durdur") : t.tr("Başlat")}
              </button>
              <button onClick={() => { setTimerActive(false); setTimerMins(5); setTimerSecs(0); }} style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12 }}>
                {t.tr("Sıfırla")}
              </button>
            </div>
          </Modal>
        )}

        {/* Settings panel */}
        {showSettings && (
          <Modal title={t.tr("Oturum Ayarları")} accent="#818cf8" onClose={() => setShowSettings(false)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10 }}>
              {[
                { action: "MUTE_ALL",    label: t.tr("Tümünü Sessize"), color: "#1e40af" },
                { action: "UNMUTE_ALL",  label: t.tr("Sesi Geri Aç"),   color: "#065f46" },
                { action: "LOCK_ROOM",   label: t.tr("Odayı Kilitle"),  color: "#7c2d12" },
                { action: "UNLOCK_ROOM", label: t.tr("Kilidi Aç"),      color: "#14532d" },
              ].map(b => (
                <button key={b.action} onClick={() => handleGlobalAction(b.action, b.label)}
                  disabled={actionLoading === b.action}
                  style={{
                    padding: "11px 8px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: `${b.color}cc`, color: "#fff", fontSize: 11, fontWeight: 700,
                    opacity: actionLoading === b.action ? 0.6 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {actionLoading === b.action ? <Spinner size={13} /> : b.label}
                </button>
              ))}
            </div>
            <button onClick={async () => {
              const ok = await sendControl("RAISE_HAND_RESET", undefined, t.tr("El kaldırmalar sıfırlandı"));
              if (ok) setSession(s => s ? { ...s, participants: s.participants.map(p => ({ ...p, handRaised: false })) } : s);
            }} style={{ ...modalBtnStyle, background: "linear-gradient(135deg,#92400e,#d97706)" }}>
              {t.tr("El Kaldırmaları Sıfırla")}
            </button>
          </Modal>
        )}

        {/* Activity log panel */}
        {showLog && (
          <div style={{
            position: "absolute", top: 58, right: 14, width: 320, maxHeight: 400,
            background: "rgba(8,9,22,0.97)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", zIndex: 50,
            backdropFilter: "blur(24px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>{t.tr("Aktivite Günlüğü")}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {log.length > 0 && <button onClick={() => setLog([])} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>{t.tr("Temizle")}</button>}
                <button onClick={() => setShowLog(false)} style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="close" s={10} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              {log.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12, padding: "16px 0" }}>{t.tr("Henüz aktivite yok")}</p>
              ) : [...log].reverse().map(entry => {
                const colors: Record<string, string> = { success: "#22c55e", warn: "#f59e0b", error: "#ef4444", info: "#818cf8" };
                return (
                  <div key={entry.id} style={{
                    padding: "6px 8px", borderRadius: 7, fontSize: 11,
                    background: `${colors[entry.type]}0d`,
                    border: `1px solid ${colors[entry.type]}22`,
                    display: "flex", gap: 7,
                  }}>
                    <span style={{ color: colors[entry.type], marginTop: 1 }}>
                      {entry.type === "success" ? <Ic n="check" s={10}/> : entry.type === "warn" ? <Ic n="warn" s={10}/> : <Ic n="info" s={10}/>}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{entry.action}</div>
                      {entry.detail && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{entry.detail}</div>}
                    </div>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", flexShrink: 0 }}>
                      {entry.timestamp.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );

  if (!mounted) return classroomEl;
  return createPortal(classroomEl, document.body);
}

/* ─── Helper sub-components ─────────────────────────────────────────────── */
function TileAction({ color, label, onClick }: { color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      padding: "3px 6px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 8, fontWeight: 700,
      background: `${color}18`, color, textAlign: "center",
      outline: `1px solid ${color}30`,
    }}>{label}</button>
  );
}

function CtrlBtn({ icon, label, active, onClick, isRecording }: {
  icon: string; label: string; active?: boolean; onClick: () => void; isRecording?: boolean;
}) {
  const bg = isRecording
    ? "rgba(239,68,68,0.18)"
    : active === false
    ? "rgba(239,68,68,0.1)"
    : active === true
    ? "rgba(255,255,255,0.07)"
    : "rgba(255,255,255,0.05)";
  const col = isRecording ? "#ef4444" : active === false ? "#ef4444" : "rgba(255,255,255,0.65)";
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)",
      background: bg, color: col,
      cursor: "pointer", fontSize: 9, fontWeight: 700,
      transition: "all 0.15s", whiteSpace: "nowrap", minWidth: 52,
    }}>
      <Ic n={icon} s={18} />
      {label}
    </button>
  );
}

function Modal({ title, accent, onClose, children }: {
  title: string; accent: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 340, background: "rgba(8,9,22,0.98)",
        border: `1px solid ${accent}30`,
        borderRadius: 16, padding: "20px 20px 16px",
        boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)`,
        animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.88)" }}>{title}</span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="close" s={11} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.85)", fontSize: 12, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};

const modalBtnStyle: React.CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 9, border: "none",
  background: "linear-gradient(135deg,#5B6EFF,#00B4D8)",
  color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const modalCounterBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
  fontSize: 18, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
