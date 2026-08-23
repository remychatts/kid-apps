/** Runs the Rounding Rally game and renders both object teams. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./App.css";

type Mode = "easy" | "hard";
type SymbolKey = "dot" | "rabbit" | "cat" | "dog" | "frog" | "panda";

const SYMBOLS: Array<{ key: SymbolKey; glyph: string; name: string }> = [
  { key: "dot", glyph: "●", name: "Dots" },
  { key: "rabbit", glyph: "🐰", name: "Rabbits" },
  { key: "cat", glyph: "🐱", name: "Cats" },
  { key: "dog", glyph: "🐶", name: "Dogs" },
  { key: "frog", glyph: "🐸", name: "Frogs" },
  { key: "panda", glyph: "🐼", name: "Pandas" },
];

const EASY_VALUES = [1, 10, 100, 1000];
const HARD_VALUES = [
  ...Array.from({ length: 9 }, (_, index) => index + 1),
  ...Array.from({ length: 9 }, (_, index) => (index + 1) * 10),
  ...Array.from({ length: 9 }, (_, index) => (index + 1) * 100),
  1000,
];

const APPLAUSE = [
  "mixkit-cartoon-monkey-applause-103.mp3",
  "mixkit-classroom-spontaneous-applause-500.mp3",
  "mixkit-girls-audience-applause-510.mp3",
  "mixkit-small-group-cheer-and-applause-518.mp3",
];

const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const MYSTERY_BANDS = [
  [1, 2, 3, 4, 6, 7, 8, 9],
  Array.from({ length: 90 }, (_, index) => index + 10).filter(
    (number) => number <= 40 || number >= 60,
  ),
  Array.from({ length: 901 }, (_, index) => index + 100).filter(
    (number) => number <= 400 || number >= 600,
  ),
];

/** Chooses an allowed number while giving each order-of-magnitude band equal probability. */
function randomMysteryNumber() {
  const band = MYSTERY_BANDS[Math.floor(Math.random() * MYSTERY_BANDS.length)];
  return band[Math.floor(Math.random() * band.length)];
}

/** Finds the closest allowed answer, resolving an exact tie upwards. */
function closestValue(number: number, values: number[]) {
  return values.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - number);
    const bestDistance = Math.abs(best - number);
    return candidateDistance < bestDistance ||
      (candidateDistance === bestDistance && candidate > best)
      ? candidate
      : best;
  });
}

/** Produces a stable pseudo-random value for an object in one round. */
function seededUnit(seed: number, index: number, salt: number) {
  const value =
    Math.sin(seed * 12.9898 + index * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

/** Plays a short UI sound without loading another media asset. */
function playTone(kind: "tap" | "reveal" | "oops", muted: boolean) {
  if (muted) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes =
    kind === "reveal" ? [440, 660] : kind === "oops" ? [260, 220] : [520];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.08;
    oscillator.type = kind === "tap" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.14);
  });
  window.setTimeout(() => void context.close(), 500);
}

interface ObjectFieldProps {
  count: number;
  symbol: SymbolKey;
  seed: number;
  label: string;
}

/** Lays objects into jittered grid cells so the distribution feels organic but cannot overlap. */
function ObjectField({ count, symbol, seed, label }: ObjectFieldProps) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.15)));
  const rows = Math.ceil(count / columns);
  const fontSize = Math.max(6.6, Math.min(45, 245 / Math.sqrt(count)));
  const selectedSymbol =
    SYMBOLS.find((option) => option.key === symbol) ?? SYMBOLS[0];
  const fieldStyle = {
    "--columns": columns,
    "--rows": rows,
    "--object-size": `${fontSize}px`,
  } as CSSProperties;

  return (
    <div
      className="object-field"
      style={fieldStyle}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => {
        const itemStyle = {
          "--jitter-x": `${(seededUnit(seed, index, 1) - 0.5) * 18}%`,
          "--jitter-y": `${(seededUnit(seed, index, 2) - 0.5) * 18}%`,
          "--turn": `${(seededUnit(seed, index, 3) - 0.5) * 12}deg`,
          "--delay": `${Math.min(index * 2, 480)}ms`,
        } as CSSProperties;
        return (
          <span className="object-cell" key={index} aria-hidden="true">
            <span
              className={`object-symbol ${symbol === "dot" ? "is-dot" : ""}`}
              style={itemStyle}
            >
              {selectedSymbol.glyph}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Shows a colourful handful of tumbling dice while a mystery team is selected. */
function DiceRoll({ step }: { step: number }) {
  return (
    <div className="dice-roll" role="status" aria-live="polite">
      <div className="dice-tray" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((offset) => (
          <span key={offset}>
            {DIE_FACES[(step * (offset + 3) + offset * 5) % DIE_FACES.length]}
          </span>
        ))}
      </div>
      <strong>Rolling a mystery team…</strong>
      <span>What will the dice decide?</span>
    </div>
  );
}

/** Renders the hard-mode controls for neighbouring answers and ×10 magnitude jumps. */
function HardControls({
  value,
  onChange,
  disabled,
  muted,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  muted: boolean;
}) {
  const index = HARD_VALUES.indexOf(value);
  const change = (next: number) => {
    playTone("tap", muted);
    onChange(next);
  };
  const smallerMagnitude = value === 1000 ? 100 : Math.max(1, value / 10);
  const biggerMagnitude = Math.min(1000, value * 10);

  return (
    <div className="number-controls hard-controls">
      <button
        className="magnitude-button"
        type="button"
        disabled={disabled || value === 1}
        onClick={() => change(smallerMagnitude)}
        aria-label="Ten times smaller"
      >
        <span>−</span>
        <small>÷10</small>
      </button>
      <button
        type="button"
        disabled={disabled || index === 0}
        onClick={() => change(HARD_VALUES[index - 1])}
        aria-label="Previous rounding number"
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        disabled={disabled || index === HARD_VALUES.length - 1}
        onClick={() => change(HARD_VALUES[index + 1])}
        aria-label="Next rounding number"
      >
        +
      </button>
      <button
        className="magnitude-button"
        type="button"
        disabled={disabled || value === 1000}
        onClick={() => change(biggerMagnitude)}
        aria-label="Ten times bigger"
      >
        <span>+</span>
        <small>×10</small>
      </button>
    </div>
  );
}

/** Sprinkles animated celebration pieces over a correct result. */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 64 }, (_, index) => (
        <i
          key={index}
          style={
            {
              "--x": `${(index * 47) % 100}%`,
              "--drift": `${((index * 29) % 180) - 90}px`,
              "--delay": `${(index % 16) * -0.09}s`,
              "--colour-index": index % 5,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>("easy");
  const [symbol, setSymbol] = useState<SymbolKey>("dot");
  const [mysteryNumber, setMysteryNumber] = useState(randomMysteryNumber);
  const [guess, setGuess] = useState(1);
  const [roundSeed, setRoundSeed] = useState(() =>
    Math.floor(Math.random() * 1_000_000),
  );
  const [roundKey, setRoundKey] = useState(0);
  const [rolling, setRolling] = useState(true);
  const [slotStep, setSlotStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("rounding-rally-muted") === "true",
  );
  const applauseRef = useRef<HTMLAudioElement | null>(null);

  const answers = mode === "easy" ? EASY_VALUES : HARD_VALUES;
  const correctAnswer = useMemo(
    () => closestValue(mysteryNumber, answers),
    [answers, mysteryNumber],
  );
  const isCorrect = revealed && guess === correctAnswer;

  useEffect(() => {
    const interval = window.setInterval(
      () => setSlotStep(Math.floor(Math.random() * 216)),
      95,
    );
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setRolling(false);
    }, 1450);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [roundKey]);

  /** Starts a completely new mystery round and returns the player's team to one. */
  const startRound = useCallback(
    (nextMode: Mode = mode) => {
      applauseRef.current?.pause();
      setMode(nextMode);
      setMysteryNumber(randomMysteryNumber());
      setRoundSeed(Math.floor(Math.random() * 1_000_000));
      setGuess(1);
      setRevealed(false);
      setRolling(true);
      setSlotStep(0);
      setRoundKey((value) => value + 1);
    },
    [mode],
  );

  /** Reveals the number and celebrates when the selected rounded value is right. */
  const reveal = () => {
    if (rolling || revealed) return;
    const correct = guess === correctAnswer;
    setRevealed(true);
    playTone(correct ? "reveal" : "oops", muted);
    if (correct && !muted) {
      const filename = APPLAUSE[Math.floor(Math.random() * APPLAUSE.length)];
      const audio = new Audio(
        `${import.meta.env.BASE_URL}applause/${filename}`,
      );
      audio.volume = 0.72;
      applauseRef.current = audio;
      window.setTimeout(() => void audio.play().catch(() => undefined), 120);
    }
  };

  /** Saves the sound preference on this device. */
  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("rounding-rally-muted", String(next));
    if (next) applauseRef.current?.pause();
    else playTone("tap", false);
  };

  const changeEasyGuess = (direction: -1 | 1) => {
    const index = EASY_VALUES.indexOf(guess);
    const next = EASY_VALUES[index + direction];
    if (next !== undefined) {
      playTone("tap", muted);
      setGuess(next);
    }
  };

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div className="brand">
          <span aria-hidden="true">🎯</span>
          <span>
            Rounding
            <br />
            Rally
          </span>
        </div>

        <fieldset className="control-group mode-picker">
          <legend>Level</legend>
          <button
            className={mode === "easy" ? "selected" : ""}
            type="button"
            aria-pressed={mode === "easy"}
            onClick={() => startRound("easy")}
          >
            Easy
          </button>
          <button
            className={mode === "hard" ? "selected" : ""}
            type="button"
            aria-pressed={mode === "hard"}
            onClick={() => startRound("hard")}
          >
            Hard
          </button>
        </fieldset>

        <label className="symbol-picker">
          <span>Team</span>
          <select
            value={symbol}
            onChange={(event) => setSymbol(event.target.value as SymbolKey)}
          >
            {SYMBOLS.map((option) => (
              <option value={option.key} key={option.key}>
                {option.glyph} {option.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="sound-button"
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          className={`toolbar-action stateful-action ${revealed ? "again-button" : "reveal-button"}`}
          type="button"
          disabled={rolling}
          onClick={revealed ? () => startRound() : reveal}
        >
          {rolling
            ? "🎲 Rolling dice…"
            : revealed
              ? "✨ Play again"
              : "💡 Reveal answer"}
        </button>
      </header>

      <p className="mode-instruction">
        {mode === "easy"
          ? "Choose the closest team size: 1, 10, 100 or 1000."
          : "Round the mystery team to one significant digit."}
      </p>

      {revealed && (
        <section
          className={`result-banner ${isCorrect ? "success" : "try-again"}`}
          role="status"
          aria-live="assertive"
        >
          <span className="result-icon" aria-hidden="true">
            {isCorrect ? "🎉" : "🎯"}
          </span>
          <div>
            <strong>
              {isCorrect ? "Brilliant rounding!" : "Good estimating!"}
            </strong>
            <span>
              {mysteryNumber} rounds to <b>{correctAnswer}</b>. You chose{" "}
              <b>{guess}</b>.
            </span>
          </div>
          <span className="difference">
            {isCorrect ? "Perfect!" : `${Math.abs(guess - mysteryNumber)} away`}
          </span>
        </section>
      )}

      <section className="game-board">
        <article className="arena mystery-arena">
          <div className="arena-heading">
            <span>
              <small>LOOK CLOSELY</small>Mystery team
            </span>
            <strong className={revealed ? "answer-revealed" : ""}>
              {revealed ? mysteryNumber : "?"}
            </strong>
          </div>
          <div className="arena-content">
            {rolling ? (
              <DiceRoll step={slotStep} />
            ) : (
              <ObjectField
                count={mysteryNumber}
                symbol={symbol}
                seed={roundSeed}
                label={`${revealed ? mysteryNumber : "A mystery number of"} ${SYMBOLS.find((item) => item.key === symbol)?.name.toLowerCase()}`}
              />
            )}
          </div>
          <p className="arena-footnote">
            {rolling
              ? "Watch the reels…"
              : revealed
                ? `Exactly ${mysteryNumber}!`
                : "Estimate without counting every one!"}
          </p>
        </article>

        <div className="versus" aria-hidden="true">
          ≈
        </div>

        <article className="arena guess-arena">
          <div className="arena-heading guess-heading">
            <span>
              <small>YOUR ESTIMATE</small>Your team
            </span>
            {mode === "easy" ? (
              <div className="number-controls easy-controls">
                <button
                  type="button"
                  disabled={revealed || guess === EASY_VALUES[0]}
                  onClick={() => changeEasyGuess(-1)}
                  aria-label="Choose a smaller team"
                >
                  −
                </button>
                <output aria-live="polite">{guess}</output>
                <button
                  type="button"
                  disabled={
                    revealed || guess === EASY_VALUES[EASY_VALUES.length - 1]
                  }
                  onClick={() => changeEasyGuess(1)}
                  aria-label="Choose a bigger team"
                >
                  +
                </button>
              </div>
            ) : (
              <HardControls
                value={guess}
                onChange={setGuess}
                disabled={revealed}
                muted={muted}
              />
            )}
          </div>
          <div className="arena-content">
            <ObjectField
              count={guess}
              symbol={symbol}
              seed={roundSeed + 99}
              label={`${guess} ${SYMBOLS.find((item) => item.key === symbol)?.name.toLowerCase()}`}
            />
          </div>
          <p className="arena-footnote">Adjust your team, then reveal!</p>
        </article>
      </section>

      {isCorrect && <Confetti />}
    </main>
  );
}

export default App;
