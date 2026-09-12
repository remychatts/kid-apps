/** Runs Fraction Feast's guided matching game and open-ended teaching display. */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playSound } from "./audio.ts";
import {
  CHALLENGE_ORDER,
  cellFillRank,
  fractionName,
  nextChallenge,
  SHARE_OPTIONS,
  simplify,
  type ShareCount,
} from "./fractions.ts";
import "./styles.css";

type Mode = "guided" | "explore";
type Stage = "pie" | "percent" | "complete";

/** Renders numerator above denominator as accessible fraction notation. */
function Fraction({ top, bottom }: { top: number; bottom: number }) {
  return (
    <span className="fraction" aria-label={`${top} over ${bottom}`}>
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

/** Displays a square pie divided into equal, individually toggleable shares. */
function Pie({
  shares,
  kept,
  onKeptChange,
  disabled = false,
  revealGroups = false,
}: {
  shares: ShareCount;
  kept: number;
  onKeptChange: (value: number) => void;
  disabled?: boolean;
  revealGroups?: boolean;
}) {
  return (
    <div
      className={`pie shares-${shares} ${revealGroups ? "reveal-groups" : ""}`}
      style={{ "--shares": shares } as CSSProperties}
      role="group"
      aria-label={`Pie cut into ${shares} equal shares; ${kept} left`}
    >
      <div className="pie-shadow" aria-hidden="true" />
      {Array.from({ length: shares }, (_, index) => {
        const retained = index < kept;
        const columns = shares === 4 ? 2 : 1;
        const rows = shares === 4 ? 2 : shares;
        const column = shares === 4 ? index % 2 : 0;
        const row = shares === 4 ? Math.floor(index / 2) : index;
        return (
          <button
            type="button"
            key={index}
            className={`pie-share ${retained ? "retained" : "eaten"}`}
            style={{
              backgroundSize: `${columns * 100}% ${rows * 100}%`,
              backgroundPosition: `${columns === 1 ? 0 : (column * 100) / (columns - 1)}% ${(row * 100) / (rows - 1)}%`,
            }}
            onClick={() => onKeptChange(index < kept ? index : index + 1)}
            disabled={disabled}
            aria-label={`Leave ${retained ? index : index + 1} of ${shares} shares`}
            aria-pressed={retained}
          >
            <span aria-hidden="true">{retained ? "" : "YUM!"}</span>
          </button>
        );
      })}
      <div className="pie-outline" aria-hidden="true" />
    </div>
  );
}

/** Draws the numbered hundred-square and makes every cell a direct percentage control. */
function HundredGrid({
  value,
  onChange,
  disabled = false,
  showGroups = false,
  shares,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showGroups?: boolean;
  shares: ShareCount;
}) {
  return (
    <div className={`grid-wrap ${showGroups ? "show-groups" : ""}`}>
      <div
        className="hundred-grid"
        role="group"
        aria-label={`${value} out of 100 squares filled`}
      >
        {Array.from({ length: 100 }, (_, index) => {
          const rank = cellFillRank(index, shares);
          const filled = rank < value;
          return (
            <button
              type="button"
              key={index}
              className={filled ? "filled" : ""}
              onClick={() => onChange(filled ? rank : rank + 1)}
              disabled={disabled}
              aria-label={`Fill ${filled ? rank : rank + 1} squares, ${filled ? rank : rank + 1} percent`}
              aria-pressed={filled}
            >
              {rank + 1}
            </button>
          );
        })}
      </div>
      {showGroups && (
        <div
          className={`grid-group-lines shares-${shares}`}
          style={{ "--shares": shares } as CSSProperties}
          aria-hidden="true"
        >
          {Array.from({ length: shares - 1 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Supplies large touch targets for exact adjustments alongside each slider. */
function Stepper({
  value,
  max,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value === max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

/** Adds a short confetti burst for a completed match. */
function Confetti({ grand = false }: { grand?: boolean }) {
  const count = grand ? 100 : 36;
  return (
    <div className={`confetti ${grand ? "grand" : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={
            {
              left: `${(index * 37) % 100}%`,
              "--drift": `${((index % 7) - 3) * 18}px`,
              animationDelay: `${(index % 9) * -0.11}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Generates a specific hint rather than merely reporting an incorrect answer. */
function percentHint(guess: number, answer: number) {
  if (guess === answer) return "";
  if (answer === 0) return "No pie is left, so the grid needs to be empty too.";
  if (answer === 100)
    return "The whole pie is left, so every little square should be filled.";
  if (guess < answer)
    return guess < answer / 2
      ? "A lot more pie is left than your grid shows."
      : "Nearly there — fill a few more little squares.";
  return guess > answer + (100 - answer) / 2
    ? "Your grid shows much more than the pie."
    : "Nearly there — your grid has a few too many squares.";
}

/** Reads a persisted number without allowing blocked storage to break the app. */
function storedNumber(key: string) {
  try {
    return Number(localStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

/** Reads a persisted boolean without allowing blocked storage to break the app. */
function storedBoolean(key: string) {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** Renders and coordinates both Fraction Feast activity modes. */
function App() {
  const [mode, setMode] = useState<Mode>("guided");
  const [level, setLevel] = useState<ShareCount>(2);
  const [problem, setProblem] = useState(0);
  const [stage, setStage] = useState<Stage>("pie");
  const [pieShares, setPieShares] = useState<ShareCount>(2);
  const [pieKept, setPieKept] = useState(1);
  const [percentage, setPercentage] = useState(0);
  const [feedback, setFeedback] = useState("Make the pie match the words.");
  const [wordsOnly, setWordsOnly] = useState(false);
  const [fullJourney, setFullJourney] = useState(true);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => storedNumber("fraction-feast-best"));
  const [muted, setMuted] = useState(() =>
    storedBoolean("fraction-feast-muted"),
  );

  const targetKept = CHALLENGE_ORDER[level][problem];
  const targetPercent = (targetKept / level) * 100;
  const targetName = fractionName(targetKept, level);
  const [simpleTop, simpleBottom] = simplify(targetKept, level);
  const equivalent =
    targetKept > 0 &&
    targetKept < level &&
    (simpleTop !== targetKept || simpleBottom !== level);
  const eaten = level - targetKept;
  const exploreMatch = Math.round((pieKept / pieShares) * 100) === percentage;
  const finalProblem = problem === CHALLENGE_ORDER[level].length - 1;
  const grandComplete = fullJourney && level === 10 && finalProblem;

  /** Resets manipulatives when a new guided problem or sharing level begins. */
  const resetGuided = (nextLevel = level, nextProblem = problem) => {
    const answer = CHALLENGE_ORDER[nextLevel][nextProblem];
    setPieShares(nextLevel);
    setPieKept(answer === 0 ? 1 : 0);
    setPercentage(answer === 0 ? 25 : 0);
    setStage("pie");
    setFeedback("Make the pie match the words.");
  };

  /** Starts the first challenge for a newly selected sharing level. */
  const chooseLevel = (next: ShareCount) => {
    setLevel(next);
    setProblem(0);
    setFullJourney(next === SHARE_OPTIONS[0]);
    resetGuided(next, 0);
    playSound("tap", muted);
  };

  /** Updates the retained shares and acknowledges continued pie work. */
  const updatePieKept = (value: number) => {
    setPieKept(value);
    if (mode === "guided" && stage === "pie")
      setFeedback("When it looks right, check your pie.");
    playSound("tap", muted);
  };

  /** Checks both the shown amount and the requested equal-share partition. */
  const checkPie = () => {
    const rightAmount = pieKept / pieShares === targetKept / level;
    if (pieShares === level && pieKept === targetKept) {
      setStage("percent");
      setFeedback(
        `Yes — ${targetKept} of ${level} equal shares are left. Now match the hundred-square.`,
      );
      playSound("correct", muted);
    } else if (rightAmount) {
      setFeedback(
        `That is the right amount! Now cut it into ${level} equal shares.`,
      );
      playSound("correct", muted);
    } else {
      setFeedback(
        pieKept / pieShares < targetKept / level
          ? "That shows too little pie. Look again at how much is left."
          : "That shows too much pie. Look again at how much is left.",
      );
      playSound("try-again", muted);
    }
  };

  /** Checks the hundred-square without revealing its target beforehand. */
  const checkPercent = () => {
    if (percentage === targetPercent) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > best) {
        setBest(nextStreak);
        try {
          localStorage.setItem("fraction-feast-best", String(nextStreak));
        } catch {
          /* Scores remain available for this visit. */
        }
      }
      setStage("complete");
      setFeedback(
        grandComplete
          ? "You matched every feast from one half to ten tenths. Magnificent work!"
          : finalProblem
            ? `You matched every ${level}-share feast. Level complete!`
            : `${percentage} little squares is exactly the same amount. Brilliant match!`,
      );
      playSound("complete", muted);
    } else {
      setFeedback(percentHint(percentage, targetPercent));
      setStreak(0);
      playSound("try-again", muted);
    }
  };

  /** Advances through each teaching order and then into the next denominator. */
  const nextProblem = () => {
    const next = nextChallenge(level, problem);
    setLevel(next.shares);
    setProblem(next.problem);
    if (next.journeyComplete) setFullJourney(true);
    resetGuided(next.shares, next.problem);
  };

  useEffect(() => {
    try {
      localStorage.setItem("fraction-feast-muted", String(muted));
    } catch {
      /* The sound choice remains for this visit. */
    }
  }, [muted]);

  const story = useMemo(() => {
    if (targetKept === level)
      return `${level} friends share equally. Nobody has eaten yet.`;
    if (targetKept === 0)
      return `${level} friends shared the pie equally. Every slice has been eaten!`;
    return `${level} friends share equally. ${eaten} ${eaten === 1 ? "slice has" : "slices have"} been eaten.`;
  }, [eaten, level, targetKept]);

  return (
    <main className="app-shell">
      {stage === "complete" && mode === "guided" && (
        <Confetti grand={grandComplete} />
      )}
      <header className="toolbar">
        <div className="brand">
          <span aria-hidden="true">🥧</span>
          <span>
            Fraction
            <br />
            Feast
          </span>
        </div>
        <div className="mode-tabs" aria-label="Activity mode">
          <button
            className={mode === "guided" ? "selected" : ""}
            onClick={() => {
              setMode("guided");
              resetGuided();
            }}
          >
            Challenge
          </button>
          <button
            className={mode === "explore" ? "selected" : ""}
            onClick={() => {
              setMode("explore");
              setFeedback("");
            }}
          >
            Explore
          </button>
        </div>
        {mode === "guided" && (
          <div className="score" aria-label={`Streak ${streak}; best ${best}`}>
            <span>🔥 {streak}</span>
            <small>best {best}</small>
          </div>
        )}
        <button
          className="sound"
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
      </header>

      {mode === "guided" ? (
        <>
          <section className="challenge-strip">
            <fieldset>
              <legend>Share between</legend>
              {SHARE_OPTIONS.map((count) => (
                <button
                  key={count}
                  className={level === count ? "selected" : ""}
                  onClick={() => chooseLevel(count)}
                >
                  {count}
                </button>
              ))}
            </fieldset>
            <div className="prompt">
              {!wordsOnly && <p>{story}</p>}
              <h1>
                {targetName}{" "}
                <span className="notation">
                  (<Fraction top={targetKept} bottom={level} />)
                </span>
              </h1>
              <small>
                Feast {problem + 1} of {CHALLENGE_ORDER[level].length}
              </small>
            </div>
            <label className="words-toggle">
              <input
                type="checkbox"
                checked={wordsOnly}
                onChange={(event) => setWordsOnly(event.target.checked)}
              />
              <span>
                Words only<small>hide story hints</small>
              </span>
            </label>
          </section>

          <section className="visuals">
            <article
              className={`card pie-card ${stage === "pie" ? "active" : ""}`}
            >
              <div className="card-title">
                <span className="step-number">1</span>
                <div>
                  <h2>Build the pie</h2>
                  <p>
                    {pieKept} of {pieShares} shares left
                  </p>
                </div>
              </div>
              <Pie
                shares={pieShares}
                kept={pieKept}
                onKeptChange={updatePieKept}
                disabled={stage !== "pie"}
                revealGroups={stage === "complete"}
              />
              <div className="pie-controls">
                <label>
                  Cut into{" "}
                  <select
                    value={pieShares}
                    disabled={stage !== "pie"}
                    onChange={(event) => {
                      const next = Number(event.target.value) as ShareCount;
                      setPieShares(next);
                      setPieKept(Math.min(pieKept, next));
                    }}
                  >
                    {SHARE_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {count} equal shares
                      </option>
                    ))}
                  </select>
                </label>
                <Stepper
                  value={pieKept}
                  max={pieShares}
                  onChange={updatePieKept}
                  label="Shares left"
                  disabled={stage !== "pie"}
                />
                {stage === "pie" && (
                  <button className="check pie-check" onClick={checkPie}>
                    Check my pie
                  </button>
                )}
              </div>
            </article>

            <div
              className={`equals ${stage === "complete" ? "complete" : ""}`}
              aria-hidden="true"
            >
              <span>{stage === "complete" ? "=" : "→"}</span>
              <small>
                {stage === "complete" ? (
                  <>
                    same
                    <br />
                    amount
                  </>
                ) : (
                  <>
                    match
                    <br />
                    this
                  </>
                )}
              </small>
            </div>

            <article
              className={`card grid-card ${stage === "percent" ? "active" : ""} ${stage === "pie" ? "locked" : ""}`}
            >
              <div className="card-title">
                <span className="step-number">2</span>
                <div>
                  <h2>Match 100 squares</h2>
                  <p>
                    {stage === "pie"
                      ? "Unlock this after the pie"
                      : `${percentage} out of 100 filled`}
                  </p>
                </div>
              </div>
              <HundredGrid
                value={percentage}
                onChange={setPercentage}
                disabled={stage !== "percent"}
                showGroups={stage === "complete"}
                shares={level}
              />
              <div className="percent-controls">
                <output aria-live="polite">
                  {stage === "pie" ? "?" : percentage}
                  <span>%</span>
                </output>
                <Stepper
                  value={percentage}
                  max={100}
                  onChange={setPercentage}
                  label="Percentage filled"
                  disabled={stage !== "percent"}
                />
                {stage === "percent" && (
                  <button
                    className="check percent-check"
                    onClick={checkPercent}
                  >
                    Check my match
                  </button>
                )}
              </div>
            </article>
          </section>

          <section
            className={`feedback feedback-${stage}`}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">
              {stage === "complete" ? "🌟" : stage === "percent" ? "💯" : "🥄"}
            </span>
            <strong>{feedback}</strong>
            {stage === "complete" && (
              <div className="equation">
                <Fraction top={targetKept} bottom={level} /> <b>=</b>{" "}
                <span>{targetPercent} out of 100</span> <b>=</b>{" "}
                <span>{targetPercent}%</span>
                <em>
                  Each of the {level} equal shares covers {100 / level} little
                  squares.
                </em>
                {equivalent && (
                  <em>
                    {targetName[0].toUpperCase() + targetName.slice(1)} is the
                    same amount as {fractionName(simpleTop, simpleBottom)}.
                  </em>
                )}
              </div>
            )}
            {stage === "complete" && (
              <button onClick={nextProblem}>
                {finalProblem
                  ? level === SHARE_OPTIONS[SHARE_OPTIONS.length - 1]
                    ? "Feast again ↻"
                    : "Next sharing level →"
                  : "Next feast →"}
              </button>
            )}
          </section>
        </>
      ) : (
        <section className="explore-shell">
          <div className="explore-heading">
            <div>
              <p>Teaching table</p>
              <h1>Make any amount</h1>
            </div>
            <span>
              Change either side. When they match, the equals sign will sparkle.
            </span>
          </div>
          <div className="visuals">
            <article className="card">
              <div className="card-title">
                <div>
                  <h2>Pie fraction</h2>
                  <p>
                    {fractionName(pieKept, pieShares)} ·{" "}
                    <Fraction top={pieKept} bottom={pieShares} />
                  </p>
                </div>
              </div>
              <Pie
                shares={pieShares}
                kept={pieKept}
                onKeptChange={updatePieKept}
              />
              <div className="pie-controls">
                <label>
                  Cut into{" "}
                  <select
                    value={pieShares}
                    onChange={(event) => {
                      const next = Number(event.target.value) as ShareCount;
                      setPieShares(next);
                      setPieKept(Math.min(pieKept, next));
                    }}
                  >
                    {SHARE_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {count} equal shares
                      </option>
                    ))}
                  </select>
                </label>
                <Stepper
                  value={pieKept}
                  max={pieShares}
                  onChange={updatePieKept}
                  label="Shares left"
                />
              </div>
            </article>
            <div
              className={`equals ${exploreMatch ? "complete" : ""}`}
              aria-live="polite"
            >
              <span>{exploreMatch ? "=" : "≠"}</span>
              <small>{exploreMatch ? "same amount" : "keep exploring"}</small>
            </div>
            <article className="card">
              <div className="card-title">
                <div>
                  <h2>Hundred-square</h2>
                  <p>{percentage} out of 100</p>
                </div>
              </div>
              <HundredGrid
                value={percentage}
                onChange={setPercentage}
                shares={pieShares}
                showGroups={exploreMatch}
              />
              <div className="percent-controls">
                <output>
                  {percentage}
                  <span>%</span>
                </output>
                <Stepper
                  value={percentage}
                  max={100}
                  onChange={setPercentage}
                  label="Percentage filled"
                />
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
