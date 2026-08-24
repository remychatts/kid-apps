/** Coordinates rounds, adaptive difficulty, scores and feedback effects. */
import { useState, useCallback, useRef, useEffect } from "react";
import { StaircaseTaskSelector } from "./staircase";
import TRUMPET_NOTE_TASKS from "./tasks";
import {
  getFingering,
  getNoteNameFromString,
  displayTextToFingering,
} from "./fingeringUtils";
import {
  playSound,
  playSuccessSound,
  playFailureSound,
  playStreakSound,
  playHighScoreSound,
} from "./gameSounds";

// ============================================================
// LocalStorage keys
// ============================================================
const STORAGE_KEYS = {
  HIGH_SCORE: "trumpet-game-high-score",
  HIGH_STREAK: "trumpet-game-high-streak",
  END_GAME_HIGH_SCORE: "trumpet-game-end-game-high-score",
  LAST_TASK_TIME: "trumpet-game-last-task-time",
};

const MAX_ROUNDS = 8;
const QUICK_RESTART_WINDOW_MS = 60 * 1000;

// ============================================================
// Reward message variations
// ============================================================
const STREAK_MESSAGES = [
  (n: number) => `Amazing! ${n} perfect answers in a row!`,
  (n: number) => `Wow! ${n} in a row! You're on fire!`,
  (n: number) => `Incredible! ${n} perfect streak!`,
  (n: number) => `${n} perfect! Keep it going!`,
  (n: number) => `Fantastic! ${n} correct in a row!`,
];

const HIGH_SCORE_MESSAGES = [
  (n: number) => `${n} points! New high score!`,
  (n: number) => `New record: ${n} points!`,
  (n: number) => `${n}! That's your best yet!`,
  (n: number) => `High score: ${n}! Amazing!`,
];

const NEW_RECORD_SUFFIX = [
  "That's a new record!",
  "You beat your record!",
  "New personal best!",
];

const END_GAME_RECORD_MESSAGES = [
  (n: number) => `${n} points! New game record!`,
  (n: number) => `You crushed it - ${n} points! New best game!`,
  (n: number) => `${n}! Fresh end-of-game high score!`,
];

// ============================================================
// Types
// ============================================================

export type GamePhase =
  | "playing" // User is making selections
  | "celebrating" // Both correct, showing celebration before next task
  | "gameover" // Game finished after max rounds
  | "idle"; // Initial state before first task

export interface RewardMessage {
  text: string;
  type: "streak" | "highscore";
}

export interface GameState {
  // Current task
  currentTask: string | null;

  // Component versions (increment to clear selections)
  keyboardVersion: number;
  fingeringVersion: number;

  // Selection state
  keyboardFrozen: boolean;
  fingeringFrozen: boolean;
  keyboardCorrect: boolean | null; // null = no selection yet, true/false = result
  fingeringCorrect: boolean | null;

  // Scores
  totalScore: number;
  runningPerfectRounds: number;
  historicalHighScore: number;
  historicalHighStreak: number;
  endGameHighScore: number;
  endGameRewardMessage: string | null;
  roundsCompleted: number;
  maxRounds: number;

  // UI state
  phase: GamePhase;
  rewardMessage: RewardMessage | null;
  celebrationProgress: number; // 0-100 for progress bar
  showPerfectAnimation: boolean; // True when score is 2 (both correct first try)
  showOkAnimation: boolean; // True when round completes but wasn't perfect

  // Highlight colors for components
  keyboardHighlight: "none" | "correct" | "incorrect";
  fingeringHighlight: "none" | "correct" | "incorrect";
}

export interface GameActions {
  handleKeyboardSelect: (note: string) => void;
  handleFingeringSelect: (fingering: string) => void;
  startNewGame: () => void;
}

// ============================================================
// Helper functions
// ============================================================

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored) as T;
    }
  } catch {
    // Ignore errors
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore errors
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// Game Controller Hook
// ============================================================

export function useGameController(): [GameState, GameActions] {
  // Initialize staircase selector
  const staircaseRef = useRef<StaircaseTaskSelector | null>(null);
  if (!staircaseRef.current) {
    staircaseRef.current = new StaircaseTaskSelector(TRUMPET_NOTE_TASKS, {
      initialStepSize: 2,
    });
  }

  // Load historical values from localStorage
  const [historicalHighScore, setHistoricalHighScore] = useState(() =>
    loadFromStorage(STORAGE_KEYS.HIGH_SCORE, 0),
  );
  const [historicalHighStreak, setHistoricalHighStreak] = useState(() =>
    loadFromStorage(STORAGE_KEYS.HIGH_STREAK, 0),
  );
  const [endGameHighScore, setEndGameHighScore] = useState(() =>
    loadFromStorage(STORAGE_KEYS.END_GAME_HIGH_SCORE, 0),
  );

  // Game state
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [keyboardVersion, setKeyboardVersion] = useState(0);
  const [fingeringVersion, setFingeringVersion] = useState(0);
  const [keyboardFrozen, setKeyboardFrozen] = useState(false);
  const [fingeringFrozen, setFingeringFrozen] = useState(false);
  const [keyboardCorrect, setKeyboardCorrect] = useState<boolean | null>(null);
  const [fingeringCorrect, setFingeringCorrect] = useState<boolean | null>(
    null,
  );
  const [keyboardHighlight, setKeyboardHighlight] = useState<
    "none" | "correct" | "incorrect"
  >("none");
  const [fingeringHighlight, setFingeringHighlight] = useState<
    "none" | "correct" | "incorrect"
  >("none");

  // Scores
  const [totalScore, setTotalScore] = useState(0);
  const [runningPerfectRounds, setRunningPerfectRounds] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [endGameRewardMessage, setEndGameRewardMessage] = useState<
    string | null
  >(null);

  // Throttling for high score rewards
  const runningBestHighScoreRef = useRef(0);
  const highScoreBeatsToSkipRef = useRef(0);

  // Track first attempt for scoring
  const keyboardFirstAttemptRef = useRef(true);
  const fingeringFirstAttemptRef = useRef(true);

  // UI state
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [rewardMessage, setRewardMessage] = useState<RewardMessage | null>(
    null,
  );
  const [celebrationProgress, setCelebrationProgress] = useState(0);
  const [showPerfectAnimation, setShowPerfectAnimation] = useState(false);
  const [showOkAnimation, setShowOkAnimation] = useState(false);

  // Animation refs
  const celebrationTimerRef = useRef<number | null>(null);
  const rewardTimerRef = useRef<number | null>(null);
  const lastGameEndedAtRef = useRef<number | null>(null);
  const lastGameEndLevelRef = useRef<number | null>(null);

  // Start a new task
  const startNewTask = useCallback(() => {
    if (!staircaseRef.current) return;

    const { task } = staircaseRef.current.nextTask();
    setCurrentTask(task);

    // Reset selection state
    setKeyboardVersion((v) => v + 1);
    setFingeringVersion((v) => v + 1);
    setKeyboardFrozen(false);
    setFingeringFrozen(false);
    setKeyboardCorrect(null);
    setFingeringCorrect(null);
    setKeyboardHighlight("none");
    setFingeringHighlight("none");
    keyboardFirstAttemptRef.current = true;
    fingeringFirstAttemptRef.current = true;

    setPhase("playing");
    setCelebrationProgress(0);
    setShowPerfectAnimation(false);
    setShowOkAnimation(false);

    // Update last task time
    saveToStorage(STORAGE_KEYS.LAST_TASK_TIME, Date.now());
  }, []);

  // Start a new game
  const startNewGame = useCallback(() => {
    const now = Date.now();
    const lastGameEndedAt = lastGameEndedAtRef.current;
    const lastGameEndLevel = lastGameEndLevelRef.current ?? 0;
    const isQuickRestart =
      phase === "gameover" &&
      lastGameEndedAt !== null &&
      now - lastGameEndedAt <= QUICK_RESTART_WINDOW_MS;
    const startLevel = isQuickRestart ? Math.floor(lastGameEndLevel / 2) : 0;

    // Reset staircase (quick restart uses half of last end level)
    staircaseRef.current?.reset(startLevel);

    // Reset scores
    setTotalScore(0);
    setRunningPerfectRounds(0);
    setRoundsCompleted(0);
    setEndGameRewardMessage(null);
    runningBestHighScoreRef.current = 0;
    highScoreBeatsToSkipRef.current = 0;

    // Clear reward message
    setRewardMessage(null);
    if (rewardTimerRef.current) {
      clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
    if (celebrationTimerRef.current) {
      cancelAnimationFrame(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    // Start first task
    startNewTask();
  }, [phase, startNewTask]);

  const finishGame = useCallback(
    (finalScore: number) => {
      const currentLevel = staircaseRef.current?.getCurrentLevel() ?? 0;
      lastGameEndLevelRef.current = currentLevel;
      lastGameEndedAtRef.current = Date.now();

      setPhase("gameover");
      setKeyboardFrozen(true);
      setFingeringFrozen(true);
      setKeyboardHighlight("none");
      setFingeringHighlight("none");
      setCelebrationProgress(0);
      setShowPerfectAnimation(false);
      setShowOkAnimation(false);

      if (celebrationTimerRef.current) {
        cancelAnimationFrame(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }

      if (rewardTimerRef.current) {
        clearTimeout(rewardTimerRef.current);
        rewardTimerRef.current = null;
      }
      setRewardMessage(null);

      if (finalScore > endGameHighScore) {
        const message = pickRandom(END_GAME_RECORD_MESSAGES)(finalScore);
        setEndGameHighScore(finalScore);
        saveToStorage(STORAGE_KEYS.END_GAME_HIGH_SCORE, finalScore);
        setEndGameRewardMessage(message);
        playHighScoreSound();
      } else {
        setEndGameRewardMessage(null);
      }
    },
    [endGameHighScore],
  );

  // Handle round completion
  const completeRound = useCallback(
    (roundScore: number) => {
      // Update total score
      const newTotalScore = totalScore + roundScore;
      setTotalScore(newTotalScore);

      // Update perfect rounds streak
      let newPerfectStreak = runningPerfectRounds;
      if (roundScore === 2) {
        newPerfectStreak = runningPerfectRounds + 1;
        setRunningPerfectRounds(newPerfectStreak);
        playSound("win");
        setShowPerfectAnimation(true);
      } else {
        newPerfectStreak = 0;
        setRunningPerfectRounds(0);
        playSound("ok");
        setShowOkAnimation(true);
      }

      // Record result in staircase (consider 1+ points as "correct" for difficulty adjustment)
      staircaseRef.current?.recordResult(roundScore == 2);

      // Check for rewards
      let showReward = false;
      let reward: RewardMessage | null = null;

      // Check perfect streak milestone (multiples of 5)
      if (newPerfectStreak > 0 && newPerfectStreak % 5 === 0) {
        let message = pickRandom(STREAK_MESSAGES)(newPerfectStreak);

        // Check if this is a new record
        if (newPerfectStreak > historicalHighStreak) {
          message += " " + pickRandom(NEW_RECORD_SUFFIX);
          setHistoricalHighStreak(newPerfectStreak);
          saveToStorage(STORAGE_KEYS.HIGH_STREAK, newPerfectStreak);
        }

        playStreakSound();
        reward = { text: message, type: "streak" };
        showReward = true;
      }
      // Check high score (only if no streak reward)
      else if (newTotalScore > historicalHighScore) {
        // Update throttling state
        runningBestHighScoreRef.current += 1;

        if (highScoreBeatsToSkipRef.current === 0) {
          highScoreBeatsToSkipRef.current = runningBestHighScoreRef.current;
        }

        // Check if we should show the reward
        if (highScoreBeatsToSkipRef.current > 0) {
          highScoreBeatsToSkipRef.current -= 1;

          if (highScoreBeatsToSkipRef.current === 0) {
            // Show the reward
            const message = pickRandom(HIGH_SCORE_MESSAGES)(newTotalScore);
            playHighScoreSound();
            reward = { text: message, type: "highscore" };
            showReward = true;
          }
        }

        // Always update historical high score
        setHistoricalHighScore(newTotalScore);
        saveToStorage(STORAGE_KEYS.HIGH_SCORE, newTotalScore);
      } else {
        // Not beating high score - reset throttling
        runningBestHighScoreRef.current = 0;
        highScoreBeatsToSkipRef.current = 0;
      }

      if (showReward && reward) {
        setRewardMessage(reward);

        // Clear reward after 3 seconds
        if (rewardTimerRef.current) {
          clearTimeout(rewardTimerRef.current);
        }
        rewardTimerRef.current = window.setTimeout(() => {
          setRewardMessage(null);
          rewardTimerRef.current = null;
        }, 3000);
      }

      const newRoundsCompleted = roundsCompleted + 1;
      setRoundsCompleted(newRoundsCompleted);

      if (newRoundsCompleted >= MAX_ROUNDS) {
        finishGame(newTotalScore);
        return;
      }

      // Start celebration phase
      setPhase("celebrating");
      setCelebrationProgress(0);

      // Animate progress bar - 2 seconds for perfect rounds with animation, 1 second otherwise
      const startTime = Date.now();
      const duration = roundScore === 2 ? 2000 : 1000;

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setCelebrationProgress(progress);

        if (elapsed < duration) {
          celebrationTimerRef.current =
            window.requestAnimationFrame(animateProgress);
        } else {
          celebrationTimerRef.current = null;
          // Start next task
          startNewTask();
        }
      };

      celebrationTimerRef.current =
        window.requestAnimationFrame(animateProgress);
    },
    [
      totalScore,
      runningPerfectRounds,
      historicalHighScore,
      historicalHighStreak,
      roundsCompleted,
      startNewTask,
      finishGame,
    ],
  );

  // Check if both selections are correct and complete round if so
  const checkRoundCompletion = useCallback(
    (kCorrect: boolean | null, fCorrect: boolean | null) => {
      if (kCorrect === true && fCorrect === true) {
        // Calculate score based on first attempts
        let score = 0;
        if (keyboardFirstAttemptRef.current) score += 1;
        if (fingeringFirstAttemptRef.current) score += 1;

        completeRound(score);
      }
    },
    [completeRound],
  );

  // Handle keyboard selection
  const handleKeyboardSelect = useCallback(
    (note: string) => {
      if (!currentTask || keyboardFrozen || phase !== "playing") return;

      const correctNote = getNoteNameFromString(currentTask);
      const isCorrect = note === correctNote;

      if (isCorrect) {
        playSuccessSound();
        setKeyboardCorrect(true);
        setKeyboardFrozen(true);
        setKeyboardHighlight("correct");
        checkRoundCompletion(true, fingeringCorrect);
      } else {
        playFailureSound();
        setKeyboardCorrect(false);
        setKeyboardHighlight("incorrect");
        keyboardFirstAttemptRef.current = false;

        // Clear incorrect highlight after a moment
        setTimeout(() => {
          setKeyboardHighlight("none");
        }, 500);
      }

      // Update last task time
      saveToStorage(STORAGE_KEYS.LAST_TASK_TIME, Date.now());
    },
    [
      currentTask,
      keyboardFrozen,
      phase,
      fingeringCorrect,
      checkRoundCompletion,
    ],
  );

  // Handle fingering selection
  const handleFingeringSelect = useCallback(
    (fingering: string) => {
      if (!currentTask || fingeringFrozen || phase !== "playing") return;

      const correctFingering = getFingering(currentTask);
      const selectedFingering = displayTextToFingering(fingering);
      const isCorrect = selectedFingering === correctFingering;

      if (isCorrect) {
        playSuccessSound();
        setFingeringCorrect(true);
        setFingeringFrozen(true);
        setFingeringHighlight("correct");
        checkRoundCompletion(keyboardCorrect, true);
      } else {
        playFailureSound();
        setFingeringCorrect(false);
        setFingeringHighlight("incorrect");
        fingeringFirstAttemptRef.current = false;

        // Clear incorrect highlight after a moment
        setTimeout(() => {
          setFingeringHighlight("none");
        }, 500);
      }

      // Update last task time
      saveToStorage(STORAGE_KEYS.LAST_TASK_TIME, Date.now());
    },
    [
      currentTask,
      fingeringFrozen,
      phase,
      keyboardCorrect,
      checkRoundCompletion,
    ],
  );

  // Check for timeout (5 minutes) on mount and periodically
  useEffect(() => {
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const checkTimeout = () => {
      const lastTaskTime = loadFromStorage(STORAGE_KEYS.LAST_TASK_TIME, 0);
      const now = Date.now();

      if (phase === "gameover") {
        return;
      }

      if (lastTaskTime === 0 || now - lastTaskTime > TIMEOUT_MS) {
        // Start a new game
        startNewGame();
      } else if (phase === "idle") {
        // Resume - just start a new task
        startNewTask();
      }
    };

    // Check immediately
    checkTimeout();

    // Check every second
    const intervalId = setInterval(checkTimeout, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [phase, startNewGame, startNewTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        cancelAnimationFrame(celebrationTimerRef.current);
      }
      if (rewardTimerRef.current) {
        clearTimeout(rewardTimerRef.current);
      }
    };
  }, []);

  const state: GameState = {
    currentTask,
    keyboardVersion,
    fingeringVersion,
    keyboardFrozen,
    fingeringFrozen,
    keyboardCorrect,
    fingeringCorrect,
    totalScore,
    runningPerfectRounds,
    historicalHighScore,
    historicalHighStreak,
    endGameHighScore,
    endGameRewardMessage,
    roundsCompleted,
    maxRounds: MAX_ROUNDS,
    phase,
    rewardMessage,
    celebrationProgress,
    showPerfectAnimation,
    showOkAnimation,
    keyboardHighlight,
    fingeringHighlight,
  };

  const actions: GameActions = {
    handleKeyboardSelect,
    handleFingeringSelect,
    startNewGame,
  };

  return [state, actions];
}
