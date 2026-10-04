/** A touch-first time machine, with persistent progress and accessible controls. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Settings as Gear,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Trophy,
  X,
  ArrowRight,
} from "lucide-react";
import {
  chooseQuestion,
  maximumAnswer,
  readSaved,
  reward,
  STORAGE_KEY,
  type Settings,
  type Saved,
} from "./model.ts";

const ERAS = [
  {
    name: "Dinosaur dawn",
    date: "150 million years ago",
    icon: "🦕",
    colour: "#79e4bf",
  },
  {
    name: "Castle in the clouds",
    date: "The year 1250",
    icon: "🏰",
    colour: "#c1a0ff",
  },
  {
    name: "Pirate paradise",
    date: "The year 1715",
    icon: "🏝️",
    colour: "#ffcc78",
  },
  {
    name: "Moon kitten colony",
    date: "The year 3026",
    icon: "🪐",
    colour: "#ff9dcb",
  },
];

/** Loads progress even when browser storage is unavailable. */
function load(): Saved {
  try {
    return readSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return readSaved(null);
  }
}

/** Runs a multiplication adventure and its settings and reward dialogs. */
export default function App() {
  const [saved, setSaved] = useState(load);
  const [question, setQuestion] = useState(() =>
    chooseQuestion(saved.settings),
  );
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<Settings>(saved.settings);
  const [storageFailed, setStorageFailed] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const rewardDialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const cheer = useRef<HTMLAudioElement | null>(null);
  const answerLock = useRef(false);
  const nextButton = useRef<HTMLButtonElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const era = ERAS[saved.progress.jumps % ERAS.length];
  const targetEra = ERAS[(saved.progress.jumps + 1) % ERAS.length];
  const maxAnswer = maximumAnswer(saved.settings);
  const fuel = saved.progress.streak % 10;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [saved]);
  useEffect(() => {
    if (settingsOpen) settingsDialog.current?.showModal();
    else settingsDialog.current?.close();
  }, [settingsOpen]);
  useEffect(() => {
    if (celebrate) rewardDialog.current?.showModal();
    else rewardDialog.current?.close();
  }, [celebrate]);
  useEffect(() => {
    if (!solved || celebrate || settingsOpen) return;
    nextButton.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(nextQuestion, 1600);
    return () => window.clearTimeout(timer);
  }, [solved, celebrate, settingsOpen]);
  useEffect(
    () => () => {
      void audio.current?.close();
      cheer.current?.pause();
    },
    [],
  );

  /** Starts audio only in a player gesture, as required by iPad browsers. */
  function playSound(big: boolean, correct: boolean) {
    if (!saved.settings.sound) return;
    if (big) {
      cheer.current ??= new Audio("./cheering.mp3");
      cheer.current.currentTime = 0;
      cheer.current.volume = 0.55;
      void cheer.current.play().catch(() => {});
    }
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      void context.resume().catch(() => {});
      (correct ? [523.25, 659.25, 783.99] : [293.66, 261.63]).forEach(
        (frequency, i) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + i * 0.09;
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.25);
        },
      );
    } catch {
      /* Muted or unavailable audio must never interrupt the quiz. */
    }
  }

  /** Locks completed questions immediately so rapid taps cannot duplicate rewards. */
  function answer(value: number) {
    if (answerLock.current || wrong.includes(value)) return;
    if (value !== question.left * question.right) {
      setWrong((previous) => [...previous, value]);
      setSaved((previous) => ({
        ...previous,
        progress: { ...previous.progress, streak: 0 },
      }));
      playSound(false, false);
      return;
    }
    answerLock.current = true;
    const progress = reward(saved.progress, wrong.length === 0);
    const big = progress.jumps > saved.progress.jumps;
    setSaved((previous) => ({ ...previous, progress }));
    setSolved(true);
    setCelebrate(big);
    playSound(big, true);
  }

  /** Starts another fact after feedback or an explicitly dismissed time jump. */
  function nextQuestion() {
    setQuestion((previous) => chooseQuestion(saved.settings, previous));
    setWrong([]);
    setSolved(false);
    setCelebrate(false);
    answerLock.current = false;
    cheer.current?.pause();
    questionHeading.current?.focus({ preventScroll: true });
  }

  /** Applies table changes as a fresh streak, retaining lifetime points and best. */
  function applySettings() {
    const changed =
      JSON.stringify(draft.limits) !== JSON.stringify(saved.settings.limits) ||
      draft.eitherOrder !== saved.settings.eitherOrder;
    setSaved((previous) => ({
      settings: draft,
      progress: changed
        ? { ...previous.progress, streak: 0 }
        : previous.progress,
    }));
    if (changed) {
      setQuestion(chooseQuestion(draft));
      setWrong([]);
      setSolved(false);
      answerLock.current = false;
    }
    if (!draft.sound) cheer.current?.pause();
    setSettingsOpen(false);
  }

  return (
    <div className="app-shell" style={{ "--era": era.colour } as CSSProperties}>
      <header className="topbar">
        <a className="brand" href="../" aria-label="Back to Kid Apps">
          <img src="./icon.svg" alt="" />
          <span>
            TIME TRAVEL CLUB <small>Little facts. Big adventures.</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="score" key={saved.progress.score}>
            <Sparkles size={18} />
            <strong>{saved.progress.score}</strong>
            <span> star points</span>
          </span>
          <button
            className="icon-button"
            aria-label={saved.settings.sound ? "Mute sounds" : "Enable sounds"}
            aria-pressed={saved.settings.sound}
            onClick={() => {
              cheer.current?.pause();
              setSaved((previous) => ({
                ...previous,
                settings: {
                  ...previous.settings,
                  sound: !previous.settings.sound,
                },
              }));
            }}
          >
            {saved.settings.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="icon-button"
            aria-label="Open settings"
            onClick={() => {
              setDraft({
                ...saved.settings,
                limits: [...saved.settings.limits],
              });
              setSettingsOpen(true);
            }}
          >
            <Gear />
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">
              YOUR NEXT ADVENTURE IS A MULTIPLICATION AWAY
            </p>
            <h1>
              Times <span>Traveller</span>
              <span className="title-star">✦</span>
            </h1>
          </div>
          <div className="best">
            <Trophy size={19} />
            <span>
              Best streak <strong>{saved.progress.best}</strong>
            </span>
          </div>
        </div>
        <div className="game-layout">
          <section className="machine-panel" aria-label="Your time machine">
            <div className="destination">
              <span className="live-dot" />
              TIME MACHINE ONLINE <span>MK. 02</span>
            </div>
            <div className="artwork">
              <img
                src="./time-kitten.png"
                alt="A ginger kitten in goggles piloting a glowing time capsule"
              />
              <span className="pilot-label">CAPTAIN WHISKERS</span>
            </div>
            <div className="era-label">
              <span>{era.icon}</span>
              <div>
                <small>CURRENT COORDINATES</small>
                <h2>{era.name}</h2>
                <p>{era.date}</p>
              </div>
            </div>
            <div className="fuel-card">
              <div className="fuel-heading">
                <span>
                  <Zap size={17} />
                  Time-jump fuel
                </span>
                <strong>{fuel} / 10</strong>
              </div>
              <div
                className="fuel-track"
                role="progressbar"
                aria-label="Streak towards next time jump"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={fuel}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={i < fuel ? "filled" : ""} />
                ))}
              </div>
              <p>
                {10 - fuel} correct in a row to{" "}
                <strong>{targetEra.name}</strong>!
              </p>
            </div>
          </section>
          <div className="quiz-column">
            <section
              className={`question-card ${solved ? "is-correct" : ""}`}
              aria-label="Multiplication question"
            >
              <div className="question-top">
                <span className="pill">
                  MISSION {String(saved.progress.jumps + 1).padStart(2, "0")}
                </span>
                <span className="streak">
                  <Zap size={16} />
                  {saved.progress.streak} streak
                </span>
              </div>
              <p className="question-prompt">
                {solved
                  ? "Beautiful work, time traveller!"
                  : "Power up the time machine!"}
              </p>
              <h2
                ref={questionHeading}
                tabIndex={-1}
                className="equation"
                aria-label={`${question.left} times ${question.right} equals ${solved ? question.left * question.right : "what"}`}
              >
                <span>{question.left}</span>
                <span className="operator">×</span>
                <span>{question.right}</span>
                <span className="operator">=</span>
                <span className="answer-slot">
                  {solved ? question.left * question.right : "?"}
                </span>
              </h2>
              <div className="feedback" role="status" aria-live="polite">
                {solved ? (
                  <>
                    <span className="points-pop">
                      +{wrong.length ? 5 : 10} star points ✦
                    </span>
                    <button ref={nextButton} onClick={nextQuestion}>
                      Next mission <ArrowRight size={16} />
                    </button>
                  </>
                ) : wrong.length ? (
                  <span>
                    Not quite. Try counting in {question.table}s — you can do
                    it!
                  </span>
                ) : (
                  <span>Find the answer below. Take your time.</span>
                )}
              </div>
            </section>
            <section className="answers-panel" aria-labelledby="answers-title">
              <div className="answers-heading">
                <h2 id="answers-title">Pick your answer</h2>
                <span>
                  ONE TAP TO TIME TRAVEL <Sparkles size={14} />
                </span>
              </div>
              <div className={`answer-grid ${maxAnswer > 30 ? "dense" : ""}`}>
                {Array.from({ length: maxAnswer }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`answer-tile ${wrong.includes(n) ? "missed" : ""} ${solved && n === question.left * question.right ? "chosen" : ""}`}
                    disabled={solved || wrong.includes(n)}
                    onClick={() => answer(n)}
                    aria-label={`Answer ${n}${wrong.includes(n) ? ", try another number" : ""}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
        <footer>
          <span>✦ A little practice. A giant leap through time.</span>
          <span>
            {saved.settings.limits
              .map((n, i) => (n ? `${i + 1}× to ${n}` : ""))
              .filter(Boolean)
              .join(" · ")}
          </span>
        </footer>
        {storageFailed && (
          <p role="status" className="storage-note">
            Your adventure works, but this browser cannot save progress right
            now.
          </p>
        )}
      </main>
      <dialog
        ref={settingsDialog}
        className="settings-dialog"
        aria-labelledby="settings-title"
        onCancel={() => setSettingsOpen(false)}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">MISSION CONTROL</p>
            <h2 id="settings-title">Set your adventure</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          >
            <X />
          </button>
        </div>
        <p>Choose your tables and how far to go. Off skips a table.</p>
        <div className="table-settings">
          {draft.limits.map((limit, i) => (
            <label key={i}>
              <span>{i + 1}× table</span>
              <select
                aria-label={`${i + 1} times table limit`}
                value={limit}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    limits: previous.limits.map((n, j) =>
                      j === i ? Number(event.target.value) : n,
                    ),
                  }))
                }
              >
                <option value={0}>Off</option>
                {Array.from({ length: 10 }, (_, n) => (
                  <option key={n} value={n + 1}>
                    Up to {n + 1} × {i + 1}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="toggle">
          <span>
            <strong>Mix the number order</strong>
            <small>Show both 5 × 3 and 3 × 5.</small>
          </span>
          <input
            type="checkbox"
            checked={draft.eitherOrder}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                eitherOrder: event.target.checked,
              }))
            }
          />
        </label>
        <label className="toggle">
          <span>
            <strong>Sounds & cheers</strong>
            <small>A little extra celebration.</small>
          </span>
          <input
            type="checkbox"
            checked={draft.sound}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                sound: event.target.checked,
              }))
            }
          />
        </label>
        <p className="settings-note">
          Changing tables or number order starts a new streak. Your points, best
          streak and destinations stay.
        </p>
        {!draft.limits.some(Boolean) && (
          <p role="alert">Choose at least one table to launch.</p>
        )}
        <button
          className="primary-button"
          disabled={!draft.limits.some(Boolean)}
          onClick={applySettings}
        >
          Let’s travel <ArrowRight size={20} />
        </button>
      </dialog>
      <dialog
        ref={rewardDialog}
        className="reward-dialog"
        aria-labelledby="reward-title"
        onCancel={(event) => {
          event.preventDefault();
          nextQuestion();
        }}
      >
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  "--i": i,
                  "--colour": ["#a490ff", "#71edcc", "#ffc96e", "#ff91c8"][
                    i % 4
                  ],
                } as CSSProperties
              }
            />
          ))}
        </div>
        <p className="eyebrow">TEN IN A ROW. ONE EPIC LEAP.</p>
        <div className="reward-planet" aria-hidden="true">
          {era.icon}
        </div>
        <h2 id="reward-title">Time jump!</h2>
        <p>
          You made it to <strong>{era.name}</strong>.
        </p>
        <img
          src="./time-kitten.png"
          alt="Captain Whiskers celebrates your ten-answer streak"
        />
        <p>
          Captain Whiskers thinks you’re <strong>purr-fect!</strong>
        </p>
        <button className="primary-button" onClick={nextQuestion}>
          Explore this era <ArrowRight size={20} />
        </button>
      </dialog>
    </div>
  );
}
