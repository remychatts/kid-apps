/**
 * Psychophysics-style staircase for selecting tasks from ordered difficulty buckets.
 *
 * - Tasks are `string[][]` where `tasksByLevel[i]` is the set of tasks at difficulty i.
 * - Binary feedback: correct / wrong.
 * - Asymmetric staircase rule:
 *   - Correct: move up by stepSize (gradual progression)
 *   - Incorrect: aggressive jump back that scales with current level
 *     (stepSize + floor(level/3)), ensuring mistakes at higher levels drop further
 * - Optional "fast start" step size (e.g., 3) that reduces toward 1 after reversals.
 *
 * Usage:
 *   const stair = new StaircaseTaskSelector(tasks, { initialStepSize: 3 });
 *   const t = stair.nextTask(); // => { level, task }
 *   // ...student answers...
 *   stair.recordResult(true); // correct
 *   // next:
 *   const t2 = stair.nextTask();
 */
export class StaircaseTaskSelector {
  private readonly tasksByLevel: string[][];
  private readonly nLevels: number;

  private level: number;
  private stepSize: number;

  private readonly initialStepSize: number;
  private readonly minStepSize: number;
  private readonly maxStepSize: number;

  // Reversal tracking: a reversal happens when response direction changes.
  private lastDirection: "up" | "down" | null = null;
  private reversals: number = 0;

  // Sampling control
  private readonly avoidImmediateRepeats: boolean;
  private lastPickedIndexByLevel: number[]; // track last task index used per level

  // Bookkeeping
  private lastResult: boolean | null = null;
  private lastTask: string | null = null; // track last task returned to avoid consecutive repeats

  constructor(
    tasksByLevel: string[][],
    opts?: {
      /** Starting level index (0-based). Default 0 (E1). */
      startLevel?: number;
      /**
       * Initial staircase step size (levels to move per response) before it reduces toward 1.
       * Default 1.
       */
      initialStepSize?: number;
      /**
       * Reduce step size after this many reversals. Default 1 (reduce on every reversal).
       */
      reduceStepAfterReversals?: number;
      /** Minimum step size. Default 1. */
      minStepSize?: number;
      /**
       * Maximum step size cap. Default = initialStepSize.
       * (Useful if you later implement step increases; kept for safety.)
       */
      maxStepSize?: number;
      /**
       * If true, tries to avoid selecting the exact same task twice in a row at a given level.
       * Default true.
       */
      avoidImmediateRepeats?: boolean;
      /**
       * Random number generator for deterministic testing.
       * Default Math.random.
       */
      rng?: () => number;
    },
  ) {
    if (!Array.isArray(tasksByLevel) || tasksByLevel.length === 0) {
      throw new Error("tasksByLevel must be a non-empty array of levels.");
    }
    if (
      tasksByLevel.some(
        (levelArr) => !Array.isArray(levelArr) || levelArr.length === 0,
      )
    ) {
      throw new Error(
        "Each difficulty level must be a non-empty array of task strings.",
      );
    }

    this.tasksByLevel = tasksByLevel;
    this.nLevels = tasksByLevel.length;

    const startLevel = opts?.startLevel ?? 0;
    if (
      !Number.isInteger(startLevel) ||
      startLevel < 0 ||
      startLevel >= this.nLevels
    ) {
      throw new Error(
        `startLevel must be an integer in [0, ${this.nLevels - 1}]`,
      );
    }

    this.initialStepSize = this.clampInt(
      opts?.initialStepSize ?? 1,
      1,
      this.nLevels - 1,
    );
    this.minStepSize = this.clampInt(
      opts?.minStepSize ?? 1,
      1,
      this.initialStepSize,
    );
    this.maxStepSize = this.clampInt(
      opts?.maxStepSize ?? this.initialStepSize,
      this.minStepSize,
      this.nLevels - 1,
    );

    this.stepSize = this.clampInt(
      this.initialStepSize,
      this.minStepSize,
      this.maxStepSize,
    );
    this.level = startLevel;

    this.avoidImmediateRepeats = opts?.avoidImmediateRepeats ?? true;
    this.lastPickedIndexByLevel = Array.from(
      { length: this.nLevels },
      () => -1,
    );

    this.reduceStepAfterReversals = this.clampInt(
      opts?.reduceStepAfterReversals ?? 1,
      1,
      Number.MAX_SAFE_INTEGER,
    );

    this.rng = opts?.rng ?? Math.random;
  }

  private readonly reduceStepAfterReversals: number;
  private readonly rng: () => number;

  /**
   * Get the next task suggestion at the current level.
   * Call recordResult(correct) afterwards to update the staircase.
   *
   * If the selected task would repeat the previous task and we're not at
   * the easiest level (level 0), we step back one level and pick from there.
   */
  public nextTask(): { level: number; task: string } {
    const initialLevel = this.level;
    let levelTasks = this.tasksByLevel[this.level];
    let idx = this.pickTaskIndex(this.level, levelTasks.length);
    let task = levelTasks[idx];

    console.log(`[Staircase] nextTask called:`, {
      level: this.level,
      tasksAtLevel: levelTasks,
      selectedIndex: idx,
      selectedTask: task,
      lastTask: this.lastTask,
    });

    // Avoid consecutive repeats unless at easiest level
    if (this.lastTask !== null && task === this.lastTask && this.level > 0) {
      // Step back with a probability distribution that favors smaller steps
      // At low levels: almost always step back 1
      // At higher levels: geometric distribution with more spread
      const stepsBack = this.pickStepBackAmount(this.level);
      const previousLevel = this.level;
      this.level = this.level - stepsBack;
      levelTasks = this.tasksByLevel[this.level];
      idx = this.pickTaskIndex(this.level, levelTasks.length);
      task = levelTasks[idx];

      console.log(`[Staircase] Avoiding repeat "${this.lastTask}":`, {
        previousLevel,
        stepsBack,
        newLevel: this.level,
        newTasksAtLevel: levelTasks,
        newSelectedTask: task,
      });
    }

    this.lastPickedIndexByLevel[this.level] = idx;
    this.lastTask = task;

    console.log(`[Staircase] nextTask result:`, {
      initialLevel,
      finalLevel: this.level,
      task,
    });

    return { level: this.level, task };
  }

  /**
   * Record whether the student got the last task correct.
   * This updates the current difficulty level using an asymmetric staircase:
   * - Correct: move up by stepSize (gradual progression)
   * - Incorrect: jump back more aggressively, scaling with current level
   */
  public recordResult(correct: boolean): void {
    if (typeof correct !== "boolean")
      throw new Error("correct must be boolean.");

    const previousLevel = this.level;
    const previousStepSize = this.stepSize;

    // Determine intended direction for this response
    const direction: "up" | "down" = correct ? "up" : "down";

    // Reversal detection: direction changed compared to previous non-null direction
    const isReversal =
      this.lastDirection !== null && direction !== this.lastDirection;
    if (isReversal) {
      this.reversals += 1;

      // Reduce step size after the configured count of reversals
      if (this.reversals % this.reduceStepAfterReversals === 0) {
        this.stepSize = Math.max(this.minStepSize, this.stepSize - 1);
      }
    }

    this.lastDirection = direction;
    this.lastResult = correct;

    // Apply staircase move
    let levelChange: number;
    let jumpBack: number | undefined;
    if (correct) {
      // Correct: always move up by 1 level (rather than making bigger leaps - maybe add that back later)
      levelChange = 1;
      this.level = this.clampInt(this.level + 1, 0, this.nLevels - 1);
    } else {
      // Incorrect: aggressive jump back, scaling with current level
      // At level 0-2: step back by stepSize (1-2 levels)
      // At level 3-5: step back by ~2 levels
      // At level 6-9: step back by ~3 levels
      // At level 10+: step back by ~4+ levels
      // Formula: stepSize + floor(level / 3), capped to not go below 0
      jumpBack = this.stepSize + Math.floor(previousLevel / 3);
      levelChange = -jumpBack;
      this.level = this.clampInt(previousLevel - jumpBack, 0, this.nLevels - 1);
    }

    console.log(`[Staircase] recordResult:`, {
      correct,
      previousLevel,
      direction,
      isReversal,
      reversalCount: this.reversals,
      stepSize: previousStepSize,
      stepSizeAfter: this.stepSize,
      ...(jumpBack !== undefined && { jumpBack }),
      levelChange,
      newLevel: this.level,
      nLevels: this.nLevels,
    });
  }

  /** Current difficulty level index (0-based). */
  public getCurrentLevel(): number {
    return this.level;
  }

  /** Current step size in levels. */
  public getCurrentStepSize(): number {
    return this.stepSize;
  }

  /** Total reversals observed so far. */
  public getReversalCount(): number {
    return this.reversals;
  }

  /** Last recorded result (true/false), or null if none yet. */
  public getLastResult(): boolean | null {
    return this.lastResult;
  }

  /**
   * Reset the session to startLevel (default 0) and restore step size to initialStepSize.
   */
  public reset(startLevel: number = 0): void {
    if (
      !Number.isInteger(startLevel) ||
      startLevel < 0 ||
      startLevel >= this.nLevels
    ) {
      throw new Error(
        `startLevel must be an integer in [0, ${this.nLevels - 1}]`,
      );
    }
    this.level = startLevel;
    this.stepSize = this.initialStepSize;
    this.lastDirection = null;
    this.reversals = 0;
    this.lastResult = null;
    this.lastTask = null;
    this.lastPickedIndexByLevel.fill(-1);
  }

  /**
   * Optional: manually set the current level (clamped).
   * Useful if you want to seed the session from a stored estimate while still "starting at E1" in UI.
   */
  public setCurrentLevel(level: number): void {
    if (!Number.isFinite(level))
      throw new Error("level must be a finite number.");
    this.level = this.clampInt(Math.round(level), 0, this.nLevels - 1);
  }

  // --- helpers ---

  private clampInt(v: number, lo: number, hi: number): number {
    if (!Number.isFinite(v)) throw new Error("Value must be finite.");
    const iv = Math.floor(v);
    return Math.min(hi, Math.max(lo, iv));
  }

  private pickTaskIndex(level: number, len: number): number {
    if (len === 1) return 0;

    const lastIdx = this.lastPickedIndexByLevel[level];
    if (!this.avoidImmediateRepeats || lastIdx < 0) {
      return Math.floor(this.rng() * len);
    }

    // Pick uniformly from all indices except lastIdx
    const r = Math.floor(this.rng() * (len - 1));
    return r >= lastIdx ? r + 1 : r;
  }

  /**
   * Pick how many levels to step back when avoiding a repeat.
   * Uses a geometric-like distribution where:
   * - At low levels (≤4): almost always returns 1
   * - At higher levels: most likely 1, with decreasing probability for 2, 3, etc.
   *
   * The decay factor increases with level, capped at 0.5, giving more spread at higher levels.
   */
  private pickStepBackAmount(currentLevel: number): number {
    // Can step back at most currentLevel steps (to reach level 0)
    const maxSteps = currentLevel;
    if (maxSteps <= 1) return 1;

    // Decay factor: 0 at level ≤4 (always step back 1), increasing to 0.5 at higher levels
    // This gives a geometric distribution with more spread at higher difficulty
    const decay = Math.min(0.5, Math.max(0, (currentLevel - 4) * 0.1));

    if (decay === 0) return 1;

    // Build cumulative distribution for geometric weights
    // P(k) ∝ decay^(k-1) for k = 1, 2, ..., maxSteps
    const weights: number[] = [];
    let sum = 0;
    for (let k = 1; k <= maxSteps; k++) {
      const w = Math.pow(decay, k - 1);
      weights.push(w);
      sum += w;
    }

    // Sample from the distribution
    const r = this.rng() * sum;
    let cumulative = 0;
    for (let k = 1; k <= maxSteps; k++) {
      cumulative += weights[k - 1];
      if (r < cumulative) {
        return k;
      }
    }
    return maxSteps; // fallback (shouldn't happen due to floating point)
  }
}
