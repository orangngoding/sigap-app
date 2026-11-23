"use client";
import { useCallback, useSyncExternalStore } from "react";

export interface PromptPasang extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let promptTersimpan: PromptPasang | null = null;
const pendengar = new Set<() => void>();

function beriTahu() {
  pendengar.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptTersimpan = e as PromptPasang;
    beriTahu();
  });

  window.addEventListener("appinstalled", () => {
    promptTersimpan = null;
    beriTahu();
  });
}

export function cekStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export type TipePlatform = "ios" | "android" | "desktop";

export function deteksiPlatform(uaString?: string, platString?: string, touchPoints?: number): TipePlatform {
  const ua = (uaString ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  const platform = (platString ?? (typeof navigator !== "undefined" ? (navigator as unknown as { platform?: string }).platform : "") ?? "").toLowerCase();
  const maxTouch = touchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);

  const isIOS = /iphone|ipad|ipod/.test(ua) || (platform === "macintel" && maxTouch > 1);
  if (isIOS) return "ios";

  if (/android/.test(ua)) return "android";
  return "desktop";
}

const langgananPrompt = (callback: () => void) => {
  pendengar.add(callback);
  return () => {
    pendengar.delete(callback);
  };
};

const getBisaPasangSnapshot = () => promptTersimpan !== null;
const getServerFalse = () => false;

const langgananStandalone = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(display-mode: standalone)");
  const handler = () => callback();
  if (mq.addEventListener) mq.addEventListener("change", handler);
  window.addEventListener("appinstalled", handler);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    window.removeEventListener("appinstalled", handler);
  };
};

const getStandaloneSnapshot = () => cekStandalone();

const langgananPlatform = () => () => {};
const getPlatformSnapshot = () => deteksiPlatform();
const getPlatformServerSnapshot = (): TipePlatform => "desktop";

export function usePasangPwa() {
  const bisaPasang = useSyncExternalStore(langgananPrompt, getBisaPasangSnapshot, getServerFalse);
  const sudahTerpasang = useSyncExternalStore(langgananStandalone, getStandaloneSnapshot, getServerFalse);
  const platform = useSyncExternalStore(langgananPlatform, getPlatformSnapshot, getPlatformServerSnapshot);

  const pasang = useCallback(async (): Promise<boolean> => {
    if (!promptTersimpan) return false;
    try {
      await promptTersimpan.prompt();
      const hasil = await promptTersimpan.userChoice;
      if (hasil?.outcome === "accepted") {
        promptTersimpan = null;
        beriTahu();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    bisaPasang,
    sudahTerpasang,
    platform,
    pasang,
  };
}
