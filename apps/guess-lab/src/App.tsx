/** Runs Guess Lab's human and algorithm number-guessing experiments. */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { playAutoTick, playResponse, wakeAudio } from "./audio.ts";
import {
  ALGORITHMS,
  getAlgorithm,
  nextGuess,
  runAlgorithm,
  type AlgorithmId,
  type GuessRecord,
  type GuessResult,
} from "./algorithms.ts";
import "./styles.css";

type Player = "human" | AlgorithmId;
type RoundStatus = "playing" | "complete";
type BusyMode = "play-game" | "auto" | null;

interface Results {
  games: number;
  turns: number[];
}

const EMPTY_RESULTS: Results = { games: 0, turns: [] };
const STORAGE_KEY = "guess-lab-human-results-v1";

/** Picks an integer from 1 to 100 inclusive. */
function secretNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

/** Reads valid human results saved on this device. */
function loadHumanResults(): Results {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Results | null;
    if (
      saved &&
      Number.isInteger(saved.games) &&
      Array.isArray(saved.turns) &&
      saved.turns.every(
        (turn) => Number.isInteger(turn) && turn >= 1 && turn <= 100,
      )
    ) {
      return { games: saved.turns.length, turns: saved.turns };
    }
  } catch {
    // An unreadable old value should never stop the game from opening.
  }
  return EMPTY_RESULTS;
}

/** Turns an exact mean into friendly language without hiding the graph's counts. */
function friendlyAverage(turns: number[]) {
  if (turns.length === 0) return "No games yet";
  const mean = turns.reduce((sum, turn) => sum + turn, 0) / turns.length;
  const nearestInteger = Math.round(mean);
  if (Math.abs(mean - nearestInteger) <= 0.01) {
    return `${nearestInteger} ${nearestInteger === 1 ? "turn" : "turns"}`;
  }
  const lower = Math.floor(mean);
  const fraction = mean - lower;
  if (fraction < 0.35)
    return `About ${lower} ${lower === 1 ? "turn" : "turns"}`;
  if (fraction > 0.65) {
    const upper = Math.ceil(mean);
    return `About ${upper} turns`;
  }
  return `Between ${lower} and ${lower + 1} turns`;
}

/** Calculates the still-possible range from all answers so far. */
function possibleRange(history: GuessRecord[]) {
  let low = 1;
  let high = 100;
  history.forEach(({ guess, result }) => {
    if (result === "too-low") low = Math.max(low, guess + 1);
    if (result === "too-high") high = Math.min(high, guess - 1);
  });
  return { low, high };
}

/** Renders exact counts on a compact, evenly spaced numeric x-axis. */
function Histogram({
  results,
  revision,
  highlightedTurn,
}: {
  results: Results;
  revision: number;
  highlightedTurn: number | null;
}) {
  const counts = new Map<number, number>();
  results.turns.forEach((turn) =>
    counts.set(turn, (counts.get(turn) ?? 0) + 1),
  );
  const buckets = [...counts.entries()].sort(([left], [right]) => left - right);
  const tallest = Math.max(1, ...buckets.map(([, count]) => count));
  const minimum = buckets[0]?.[0] ?? 0;
  const maximum = buckets.at(-1)?.[0] ?? 0;
  const range = maximum - minimum;
  const slotCount = range + 1;
  const barWidth = range === 0 ? 18 : Math.min(18, (100 / slotCount) * 0.92);
  const xFor = (turn: number) =>
    range === 0 ? 50 : ((turn - minimum + 0.5) / slotCount) * 100;
  const labelStep = Math.max(1, Math.ceil(range / 6));
  const axisLabels = Array.from(
    { length: Math.floor(range / labelStep) + 1 },
    (_, index) => minimum + index * labelStep,
  );
  if (axisLabels.at(-1) !== maximum) axisLabels.push(maximum);

  return (
    <section className="results" aria-label="Results">
      <div className="results-heading">
        <div>
          <span className="eyebrow">Best guesswork</span>
          <strong key={`average-${revision}`} className="average pop-in">
            {friendlyAverage(results.turns)}
          </strong>
        </div>
        <span className="game-count">
          {results.games} {results.games === 1 ? "game" : "games"}
        </span>
      </div>
      {buckets.length === 0 ? (
        <div className="empty-graph">
          <span aria-hidden="true">▥</span>
          <p>Your turns will make a graph here.</p>
        </div>
      ) : (
        <div className="histogram" aria-label="Turns taken in completed games">
          <div className="chart-plot">
            {buckets.map(([turn, count]) => {
              const description = `${turn} ${turn === 1 ? "turn" : "turns"}: ${count} ${count === 1 ? "game" : "games"}`;
              return (
                <div
                  className="bar-column"
                  key={turn}
                  style={
                    {
                      "--bar-left": `${xFor(turn)}%`,
                      "--bar-width": `${barWidth}%`,
                    } as CSSProperties
                  }
                >
                  {barWidth >= 4 && <span className="bar-count">{count}</span>}
                  <div
                    className={`bar ${highlightedTurn === turn ? "latest" : ""}`}
                    style={
                      {
                        "--bar-height": `${Math.max(8, (count / tallest) * 100)}%`,
                      } as CSSProperties
                    }
                    tabIndex={0}
                    aria-label={description}
                  >
                    <span className="bar-tooltip" role="tooltip">
                      <strong>{turn} turns</strong>
                      {count} {count === 1 ? "game" : "games"}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="chart-axis" aria-hidden="true">
              {axisLabels.map((turn) => (
                <span key={turn} style={{ left: `${xFor(turn)}%` }}>
                  {turn}
                </span>
              ))}
            </div>
            <span className="turn-axis">turns</span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Shows the ordered responses for the current or most recent game. */
function GuessHistory({ history }: { history: GuessRecord[] }) {
  if (history.length === 0) {
    return (
      <div className="history-empty">
        No guesses yet — the secret is waiting!
      </div>
    );
  }
  return (
    <ol className="history" aria-label="Guess history" aria-live="polite">
      {history
        .map((record, index) => ({ record, turn: index + 1 }))
        .reverse()
        .map(({ record, turn }) => (
          <li className={record.result} key={`${turn}-${record.guess}`}>
            <span>{turn}</span>
            <strong>{record.guess}</strong>
            <em>
              {record.result === "too-low"
                ? "Too low ↑"
                : record.result === "too-high"
                  ? "Too high ↓"
                  : "Found it! ★"}
            </em>
          </li>
        ))}
    </ol>
  );
}

/** Provides a large direct-manipulation surface for sliding a human guess. */
function GuessSlider({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ x: number; value: number } | null>(null);

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, value };
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || disabled) return;
    const next =
      drag.current.value + Math.round((event.clientX - drag.current.x) / 7);
    onChange(Math.max(1, Math.min(100, next)));
  };

  return (
    <div
      className={`guess-slider ${disabled ? "disabled" : ""}`}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Slide to change your guess"
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={value}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown")
          onChange(Math.max(1, value - 1));
        if (event.key === "ArrowRight" || event.key === "ArrowUp")
          onChange(Math.min(100, value + 1));
        if (event.key === "Home") onChange(1);
        if (event.key === "End") onChange(100);
      }}
    >
      <span>1</span>
      <div className="slider-track">
        <i style={{ left: `${value - 1}%` }}>
          <b>{value}</b>
        </i>
      </div>
      <span>100</span>
      <small>Slide me</small>
    </div>
  );
}

interface PlayerPanelProps {
  player: Player;
  onExplain?: (id: AlgorithmId) => void;
  onDelete?: () => void;
}

/** Owns one independent secret number, history, controls, and results graph. */
function PlayerPanel({ player, onExplain, onDelete }: PlayerPanelProps) {
  const isHuman = player === "human";
  const algorithm = isHuman ? null : getAlgorithm(player);
  const [target, setTarget] = useState(secretNumber);
  const [history, setHistory] = useState<GuessRecord[]>([]);
  const [status, setStatus] = useState<RoundStatus>("playing");
  const [guess, setGuess] = useState(1);
  const [results, setResults] = useState<Results>(() =>
    isHuman ? loadHumanResults() : EMPTY_RESULTS,
  );
  const [revision, setRevision] = useState(0);
  const [highlightedTurn, setHighlightedTurn] = useState<number | null>(null);
  const [busy, setBusy] = useState<BusyMode>(null);
  const autoFrame = useRef<number | null>(null);
  const autoLatest = useRef<{ target: number; history: GuessRecord[] } | null>(
    null,
  );
  const autoCount = useRef(0);
  const highlightTimer = useRef<number | null>(null);
  const range = possibleRange(history);

  useEffect(() => {
    if (isHuman) localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [isHuman, results]);

  useEffect(
    () => () => {
      if (autoFrame.current !== null) cancelAnimationFrame(autoFrame.current);
      if (highlightTimer.current !== null)
        window.clearTimeout(highlightTimer.current);
    },
    [],
  );

  /** Starts a fresh round and clears the previous graph highlight. */
  const startRound = () => {
    wakeAudio();
    setTarget(secretNumber());
    setHistory([]);
    setGuess(1);
    setStatus("playing");
    setHighlightedTurn(null);
    if (highlightTimer.current !== null)
      window.clearTimeout(highlightTimer.current);
  };

  /** Highlights the latest result until another round starts or ten seconds pass. */
  const markLatestTurn = (turnCount: number) => {
    setHighlightedTurn(turnCount);
    if (highlightTimer.current !== null)
      window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(
      () => setHighlightedTurn(null),
      10_000,
    );
  };

  /** Adds a completed game's turn count to this panel. */
  const recordGame = (turnCount: number) => {
    setResults((current) => ({
      games: current.games + 1,
      turns: [...current.turns, turnCount],
    }));
    setRevision((current) => current + 1);
    markLatestTurn(turnCount);
  };

  /** Resolves one guess against a known target. */
  const resultFor = (value: number, against: number): GuessResult =>
    value === against ? "correct" : value < against ? "too-low" : "too-high";

  /** Submits the current human guess. */
  const submitHumanGuess = () => {
    if (status !== "playing") return;
    const result = resultFor(guess, target);
    const nextHistory = [...history, { guess, result }];
    setHistory(nextHistory);
    playResponse(result);
    if (result === "correct") {
      setStatus("complete");
      recordGame(nextHistory.length);
    }
  };

  /** Takes one visible turn in the already-started round. */
  const stepAlgorithm = () => {
    if (!algorithm || status !== "playing") return;
    wakeAudio();
    const activeTarget = target;
    const activeHistory = history;
    const value = nextGuess(algorithm.id, activeHistory);
    const result = resultFor(value, activeTarget);
    const nextHistory = [...activeHistory, { guess: value, result }];
    setHistory(nextHistory);
    playResponse(result);
    if (result === "correct") {
      setStatus("complete");
      recordGame(nextHistory.length);
    }
  };

  /** Animates algorithm turns at a pace slow enough to follow. */
  const playAlgorithmGame = async () => {
    if (!algorithm || busy || status !== "playing") return;
    wakeAudio();
    setBusy("play-game");
    const activeTarget = target;
    let activeHistory = history;
    if (activeHistory.length === 0) setHistory([]);
    while (activeHistory.at(-1)?.result !== "correct") {
      const value = nextGuess(algorithm.id, activeHistory);
      const result = resultFor(value, activeTarget);
      activeHistory = [...activeHistory, { guess: value, result }];
      setHistory(activeHistory);
      playResponse(result);
      if (result !== "correct")
        await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    setStatus("complete");
    recordGame(activeHistory.length);
    setBusy(null);
  };

  /** Runs and records one invisible complete game per animation frame. */
  const startAuto = () => {
    if (!algorithm || busy) return;
    wakeAudio();
    setHighlightedTurn(null);
    if (highlightTimer.current !== null)
      window.clearTimeout(highlightTimer.current);
    setBusy("auto");
    autoCount.current = 0;
    const runFrame = () => {
      const nextTarget = secretNumber();
      const nextHistory = runAlgorithm(algorithm.id, nextTarget);
      autoLatest.current = { target: nextTarget, history: nextHistory };
      autoCount.current += 1;
      playAutoTick(autoCount.current);
      setResults((current) => ({
        games: current.games + 1,
        turns: [...current.turns, nextHistory.length],
      }));
      setRevision((current) => current + 1);
      markLatestTurn(nextHistory.length);
      autoFrame.current = requestAnimationFrame(runFrame);
    };
    autoFrame.current = requestAnimationFrame(runFrame);
  };

  /** Stops automatic trials and reveals the final trial's full history. */
  const stopAuto = () => {
    if (autoFrame.current !== null) cancelAnimationFrame(autoFrame.current);
    autoFrame.current = null;
    setBusy(null);
    if (autoLatest.current) {
      setTarget(autoLatest.current.target);
      setHistory(autoLatest.current.history);
      setStatus("complete");
      playResponse("correct");
    }
  };

  const panelStyle = {
    "--panel-colour": algorithm?.colour ?? "#00a9e8",
  } as CSSProperties;

  return (
    <article
      className={`player-panel ${busy === "auto" ? "auto-running" : ""}`}
      style={panelStyle}
    >
      <header className="panel-header">
        <div className="player-identity">
          <span className="player-symbol" aria-hidden="true">
            {algorithm?.symbol ?? "✋"}
          </span>
          <div>
            <span className="eyebrow">{isHuman ? "Player" : "Algorithm"}</span>
            <h2>{algorithm?.name ?? "You"}</h2>
            <p>
              {algorithm?.shortDescription ?? "Use your own clever guesses"}
            </p>
          </div>
        </div>
        {onDelete && (
          <button
            className="delete-button"
            type="button"
            onClick={onDelete}
            disabled={busy !== null}
            aria-label={`Remove ${algorithm?.name}`}
          >
            ×
          </button>
        )}
      </header>

      <div className="panel-body">
        <section
          className="play-zone"
          aria-label={`${algorithm?.name ?? "Human"} game`}
        >
          <div className="round-strip">
            {status === "complete" && (
              <button
                className="new-round"
                type="button"
                onClick={startRound}
                disabled={busy !== null}
              >
                Play again
              </button>
            )}
            <div className="possible-range">
              {status === "complete" ? (
                <span>
                  Secret number: <strong>{target}</strong>
                  <i aria-hidden="true">•</i>
                  Turns: <strong>{history.length}</strong>
                </span>
              ) : (
                <span>
                  Could be{" "}
                  <strong>
                    {range.low === range.high
                      ? range.low
                      : `${range.low}–${range.high}`}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {isHuman ? (
            <div className="human-controls">
              <div className="number-entry">
                <label htmlFor="human-guess">Your guess</label>
                <input
                  id="human-guess"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={100}
                  type="number"
                  value={guess}
                  disabled={status !== "playing"}
                  onChange={(event) =>
                    setGuess(
                      Math.max(
                        1,
                        Math.min(100, Number(event.target.value) || 1),
                      ),
                    )
                  }
                />
                <button
                  className="primary-action"
                  type="button"
                  onClick={submitHumanGuess}
                  disabled={status !== "playing"}
                >
                  Is it {guess}?
                </button>
              </div>
              <GuessSlider
                value={guess}
                disabled={status !== "playing"}
                onChange={setGuess}
              />
              {results.games > 0 && (
                <button
                  className="reset-button"
                  type="button"
                  onClick={() => {
                    setResults(EMPTY_RESULTS);
                    setRevision((current) => current + 1);
                    setHighlightedTurn(null);
                    localStorage.removeItem(STORAGE_KEY);
                  }}
                >
                  Reset my results
                </button>
              )}
            </div>
          ) : (
            <div className="algorithm-controls">
              <button
                type="button"
                onClick={() => onExplain?.(algorithm!.id)}
                disabled={busy !== null}
              >
                Explain
              </button>
              <button
                type="button"
                onClick={stepAlgorithm}
                disabled={busy !== null || status === "complete"}
              >
                Play turn
              </button>
              <button
                type="button"
                onClick={() => void playAlgorithmGame()}
                disabled={busy !== null || status === "complete"}
              >
                Play game
              </button>
              <button
                className={busy === "auto" ? "stop-button" : "auto-button"}
                type="button"
                onClick={busy === "auto" ? stopAuto : startAuto}
                disabled={
                  busy === "play-game" ||
                  (status === "complete" && busy !== "auto")
                }
              >
                {busy === "auto" ? "Stop" : "Auto"}
              </button>
            </div>
          )}

          <GuessHistory history={history} />
          {busy === "auto" && (
            <div className="auto-banner" role="status">
              <i /> Running super-fast experiments…
            </div>
          )}
        </section>
        <Histogram
          results={results}
          revision={revision}
          highlightedTurn={highlightedTurn}
        />
      </div>
    </article>
  );
}

/** Draws one example strategy as a friendly annotated number line. */
function AlgorithmDiagram({ id }: { id: AlgorithmId }) {
  const algorithm = getAlgorithm(id);
  const left = 54;
  const right = 706;
  const xFor = (value: number) =>
    left +
    ((value - algorithm.exampleMin) /
      (algorithm.exampleMax - algorithm.exampleMin)) *
      (right - left);
  const ticks = Array.from(
    { length: algorithm.exampleMax - algorithm.exampleMin + 1 },
    (_, index) => algorithm.exampleMin + index,
  );
  return (
    <svg
      className="algorithm-diagram"
      viewBox="0 0 760 240"
      role="img"
      aria-label={`${algorithm.name} example ending at ${algorithm.exampleTarget}`}
    >
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={algorithm.colour} />
        </marker>
      </defs>
      <path d="M45 151 Q380 146 715 151" className="paper-line" />
      {ticks.map((tick) => (
        <g key={tick}>
          <path d={`M${xFor(tick)} 140 q2 12 0 24`} className="tick" />
          <text x={xFor(tick)} y="190" textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
      {algorithm.example.slice(0, -1).map((value, index) => {
        const next = algorithm.example[index + 1];
        const x1 = xFor(value);
        const x2 = xFor(next);
        const lift = 54 + (index % 2) * 20;
        return (
          <path
            key={`${value}-${next}`}
            d={`M${x1} 132 Q${(x1 + x2) / 2} ${lift} ${x2} 132`}
            className="jump"
            style={{ "--jump-colour": algorithm.colour } as CSSProperties}
            markerEnd={`url(#arrow-${id})`}
          />
        );
      })}
      <circle
        cx={xFor(algorithm.exampleTarget)}
        cy="151"
        r="20"
        className="target-dot"
      />
      <text
        x={xFor(algorithm.exampleTarget)}
        y="158"
        textAnchor="middle"
        className="target-number"
      >
        {algorithm.exampleTarget}
      </text>
      <text x="54" y="30" className="scribble">
        Try these in order…
      </text>
    </svg>
  );
}

/** Presents either algorithm selection or a strategy explanation. */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

/** Coordinates the fixed human panel and at-most-once algorithm panels. */
export default function App() {
  const [players, setPlayers] = useState<AlgorithmId[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [explanation, setExplanation] = useState<AlgorithmId | null>(null);
  const unused = useMemo(
    () => ALGORITHMS.filter(({ id }) => !players.includes(id)),
    [players],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="home-link" href="../" aria-label="Back to Kid Apps">
          ←
        </a>
        <div>
          <span className="title-kicker">Number guessing experiments</span>
          <h1>
            Guess Lab <i>1–100</i>
          </h1>
        </div>
        <div className="header-orbit" aria-hidden="true">
          <span>?</span>
          <i>42</i>
          <b>½</b>
        </div>
      </header>

      <main>
        <PlayerPanel player="human" />
        {players.map((player) => (
          <PlayerPanel
            key={player}
            player={player}
            onExplain={setExplanation}
            onDelete={() =>
              setPlayers((current) => current.filter((id) => id !== player))
            }
          />
        ))}

        {unused.length > 0 ? (
          <button
            className="add-algorithm"
            type="button"
            onClick={() => setPickerOpen(true)}
          >
            <span>＋</span>
            <strong>Try new algorithm</strong>
            <small>
              {unused.length} {unused.length === 1 ? "idea" : "ideas"} left to
              explore
            </small>
          </button>
        ) : (
          <div className="all-added">
            ★ You are comparing every algorithm! ★
          </div>
        )}
      </main>

      {pickerOpen && (
        <Modal title="Choose an algorithm" onClose={() => setPickerOpen(false)}>
          <p className="modal-intro">
            Which guessing idea should join the experiment?
          </p>
          <div className="algorithm-picker">
            {unused.map((algorithm) => (
              <button
                key={algorithm.id}
                type="button"
                style={{ "--choice-colour": algorithm.colour } as CSSProperties}
                onClick={() => {
                  setPlayers((current) => [...current, algorithm.id]);
                  setPickerOpen(false);
                }}
              >
                <span>{algorithm.symbol}</span>
                <strong>{algorithm.name}</strong>
                <small>{algorithm.shortDescription}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {explanation && (
        <Modal
          title={getAlgorithm(explanation).name}
          onClose={() => setExplanation(null)}
        >
          <div className="paper-sheet">
            <AlgorithmDiagram id={explanation} />
            <p>{getAlgorithm(explanation).explanation}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
