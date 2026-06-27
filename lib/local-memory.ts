"use client";

import * as React from "react";

export interface LocalProfile {
  id: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalMemory {
  version: 1;
  activeProfileId: string | null;
  profiles: LocalProfile[];
}

const MEMORY_KEY = "studyloop.localMemory.v1";
const GUEST_PROFILE_ID = "guest";
const CHANGE_EVENT = "studyloop-local-memory-change";

function emptyMemory(): LocalMemory {
  return { version: 1, activeProfileId: null, profiles: [] };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeReadMemory(): LocalMemory {
  if (!isBrowser()) return emptyMemory();

  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return emptyMemory();
    const parsed = JSON.parse(raw) as Partial<LocalMemory>;
    if (!Array.isArray(parsed.profiles)) return emptyMemory();

    return {
      version: 1,
      activeProfileId:
        typeof parsed.activeProfileId === "string"
          ? parsed.activeProfileId
          : null,
      profiles: parsed.profiles
        .filter(
          (profile): profile is LocalProfile =>
            typeof profile?.id === "string" &&
            typeof profile?.nickname === "string" &&
            typeof profile?.createdAt === "string" &&
            typeof profile?.updatedAt === "string",
        )
        .slice(0, 12),
    };
  } catch {
    return emptyMemory();
  }
}

function safeWriteMemory(memory: LocalMemory) {
  if (!isBrowser()) return;
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function cleanNickname(nickname: string): string {
  return nickname.replace(/\s+/g, " ").trim().slice(0, 24);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getActiveProfile(memory: LocalMemory): LocalProfile | null {
  return (
    memory.profiles.find((profile) => profile.id === memory.activeProfileId) ??
    null
  );
}

export function getProfileStorageId(activeProfile: LocalProfile | null): string {
  return activeProfile?.id ?? GUEST_PROFILE_ID;
}

export function makeLocalStorageKey(
  scope: string,
  profileId: string,
  id: string,
): string {
  return `studyloop.${scope}.v1.${profileId}.${id}`;
}

export function readLocalValue<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocalValue<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalValue(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

export function useLocalProfile() {
  const [memory, setMemory] = React.useState<LocalMemory>(() => emptyMemory());
  const [hydrated, setHydrated] = React.useState(false);

  const refresh = React.useCallback(() => {
    setMemory(safeReadMemory());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [refresh]);

  const activeProfile = React.useMemo(() => getActiveProfile(memory), [memory]);
  const profileStorageId = getProfileStorageId(activeProfile);

  const createProfile = React.useCallback((rawNickname: string) => {
    const nickname = cleanNickname(rawNickname);
    if (!nickname) return null;

    const now = new Date().toISOString();
    const memory = safeReadMemory();
    const existing = memory.profiles.find(
      (profile) => profile.nickname.toLowerCase() === nickname.toLowerCase(),
    );

    if (existing) {
      safeWriteMemory({ ...memory, activeProfileId: existing.id });
      return existing;
    }

    const profile: LocalProfile = {
      id: createId(),
      nickname,
      createdAt: now,
      updatedAt: now,
    };
    safeWriteMemory({
      ...memory,
      activeProfileId: profile.id,
      profiles: [...memory.profiles, profile].slice(-12),
    });
    return profile;
  }, []);

  const setActiveProfile = React.useCallback((profileId: string | null) => {
    const memory = safeReadMemory();
    safeWriteMemory({ ...memory, activeProfileId: profileId });
  }, []);

  return {
    activeProfile,
    createProfile,
    hydrated,
    profileStorageId,
    profiles: memory.profiles,
    setActiveProfile,
  };
}
