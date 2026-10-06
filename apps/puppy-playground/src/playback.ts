/** Keeps only the latest requested gesture until an authored action regains support. */
export type ProtectedClip = {
  id: string;
  protectedFrom?: number;
  protectedUntil?: number;
};

/** Allows quiet fades, but preserves lifted-paw, stepping and airborne sections. */
export function canInterrupt(
  clip: ProtectedClip | undefined,
  time: number,
): boolean {
  return (
    !clip ||
    clip.protectedFrom === undefined ||
    clip.protectedUntil === undefined ||
    time < clip.protectedFrom ||
    time >= clip.protectedUntil
  );
}

/** Queues one relevant request, replacing stale clicks rather than replaying a backlog. */
export function createPlaybackQueue(library: readonly ProtectedClip[]) {
  const clips = new Map(library.map((clip) => [clip.id, clip]));
  let pending: string | null = null;
  return {
    /** Reports the single next action for accessible feedback. */
    get pending() {
      return pending;
    },
    /** Starts an interruptible request immediately or retains it until support returns. */
    request(name: string, active: string, time: number): string | null {
      if (!clips.has(name)) return null;
      if (canInterrupt(clips.get(active), time)) {
        pending = null;
        return name;
      }
      pending = name;
      return null;
    },
    /** Consumes a queued action at a safe point or at clip completion. */
    take(active: string, time: number, finished = false): string | null {
      if (!pending || (!finished && !canInterrupt(clips.get(active), time)))
        return null;
      const next = pending;
      pending = null;
      return next;
    },
    /** Drops missed actions when the page is hidden or the stage is disposed. */
    clear() {
      pending = null;
    },
  };
}
