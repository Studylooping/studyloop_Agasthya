"use client";

import * as React from "react";
import { Check, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocalProfile } from "@/lib/local-memory";

export function LocalProfileMenu() {
  const {
    activeProfile,
    createProfile,
    hydrated,
    profiles,
    setActiveProfile,
  } = useLocalProfile();
  const [open, setOpen] = React.useState(false);
  const [nickname, setNickname] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function handleCreateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profile = createProfile(nickname);
    if (!profile) {
      setError("Choose a short nickname first.");
      return;
    }
    setNickname("");
    setError(null);
  }

  const label = activeProfile?.nickname ?? "Guest";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Choose local profile"
        title="Choose local profile"
        className="max-w-36 px-2 sm:max-w-48"
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">{hydrated ? label : "Profile"}</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg">
          <div>
            <p className="font-semibold tracking-tight">Local profile</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Stored only in this browser. Use a nickname, not your real name.
            </p>
          </div>

          <form onSubmit={handleCreateProfile} className="mt-4 flex gap-2">
            <label htmlFor="local-profile-nickname" className="sr-only">
              Nickname
            </label>
            <input
              id="local-profile-nickname"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setError(null);
              }}
              maxLength={24}
              placeholder="e.g. LimitNinja"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button type="submit" size="icon" aria-label="Create profile">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <div className="mt-4 space-y-1">
            <button
              type="button"
              onClick={() => setActiveProfile(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                !activeProfile && "bg-muted",
              )}
            >
              <span>Guest profile</span>
              {!activeProfile && <Check className="h-4 w-4 text-primary" />}
            </button>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setActiveProfile(profile.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  activeProfile?.id === profile.id && "bg-muted",
                )}
              >
                <span className="truncate">{profile.nickname}</span>
                {activeProfile?.id === profile.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
