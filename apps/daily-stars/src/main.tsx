/** Daily Stars' touch-friendly adventure board, setup, rewards and settings. */
import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Sparkles,
} from "lucide-react";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import {
  cells,
  dayKey,
  initialState,
  palette,
  parseState,
  rewards,
  shapes,
  STORAGE_KEY,
  toggleGoal,
  type Entry,
  type State,
} from "./model";
import { pushBackup, restoreBackup } from "./backup";
import "./style.css";
const PASSWORD_KEY = "daily-stars-stash-password";
/** Loads saved data without silently overwriting an unreadable history. */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { state: raw ? parseState(JSON.parse(raw)) : null, error: "" };
  } catch {
    return {
      state: null,
      error:
        "Your saved data could not be opened. It has not been changed. Try reopening the app or restore a server backup.",
    };
  }
}
const loaded = load();
/** Draws a mosaic using the colours of the actual earned goals. */
function Mosaic({
  shape,
  entries,
  state,
  small = false,
}: {
  shape: number;
  entries: Entry[];
  state: State;
  small?: boolean;
}) {
  const design = shapes[shape];
  return (
    <svg
      className={small ? "mosaic small" : "mosaic"}
      viewBox={`-1 -1 ${design.rows[0].length + 2} ${design.rows.length + 2}`}
      role="img"
      aria-label={`${design.name}: ${entries.length} of ${cells(shape).length} squares filled`}
    >
      {cells(shape).map(({ x, y }, i) => (
        <rect
          key={`${x}:${y}`}
          x={x}
          y={y}
          width=".86"
          height=".86"
          rx=".18"
          className={entries[i] ? "tile filled" : "tile"}
          style={{
            fill: entries[i]
              ? state.goals.find((g) => g.id === entries[i].goal)?.colour
              : undefined,
            animationDelay: `${Math.min(i, 20) * 12}ms`,
          }}
        />
      ))}
    </svg>
  );
}
/** Keeps keyboard focus inside each modal and restores it on close. */
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={close}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close" onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
/** Plays a short rising chime without requiring a downloaded sound. */
function chime() {
  try {
    const context = new AudioContext();
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const start = context.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      oscillator.start(start);
      oscillator.stop(start + 0.26);
    });
    setTimeout(() => void context.close(), 700);
  } catch {
    /* Sound is optional on browsers with restricted audio. */
  }
}
/** Runs the child's local-first app and serialises server writes. */
function App() {
  const [state, setState] = useState<State | null>(loaded.state);
  const [error, setError] = useState(loaded.error);
  const [name, setName] = useState("");
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem(PASSWORD_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [credential, setCredential] = useState(password);
  const [modal, setModal] = useState<"settings" | "stats" | "medals" | null>(
    null,
  );
  const [offset, setOffset] = useState(0);
  const [today, setToday] = useState(dayKey());
  const [range, setRange] = useState<"all" | "30">("all");
  const [newGoal, setNewGoal] = useState("");
  const [message, setMessage] = useState("");
  const [sync, setSync] = useState("Saved on this device");
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const queue = useRef(Promise.resolve());
  const audio = useRef<HTMLAudioElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<State | null>(null);
  // Refresh today's date after sleep or midnight without turning yesterday's ticks into today's.
  useEffect(() => {
    const refresh = () => {
      const next = dayKey();
      if (next !== today) {
        setToday(next);
        setOffset(0);
      }
    };
    const id = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, [today]);
  useEffect(() => {
    const retryOnline = () => setRetry((v) => v + 1);
    window.addEventListener("online", retryOnline);
    return () => window.removeEventListener("online", retryOnline);
  }, []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setError("");
    } catch {
      setError(
        "This device could not save your progress. Free up storage and keep this app open.",
      );
    }
  }, [state]);
  useEffect(() => {
    if (!state || !password || pendingRestore || busy) return;
    let active = true;
    const timer = setTimeout(() => {
      setSync("Backing up…");
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          try {
            await pushBackup(state, password);
            if (active) setSync("Backed up to server ✓");
          } catch (e) {
            if (active)
              setSync(
                `${e instanceof Error ? e.message : "Backup unavailable."} Your progress is still saved on this device.`,
              );
          }
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [state, password, retry, pendingRestore, busy]);
  /** Commits a changed state and celebrates each newly reached medal once. */
  function commit(next: State) {
    const result = rewards(next.entries);
    if (result.medals.length > next.celebrated) {
      next = { ...next, celebrated: result.medals.length };
      setCelebration(result.medals.length - 1);
      if (next.sound) {
        audio.current = new Audio("./applause.mp3");
        void audio.current.play().catch(() => {});
      }
    }
    setState(next);
  }
  /** Restores explicitly before enabling uploads, preserving data until confirmation. */
  async function restore() {
    if (!(state?.name ?? name).trim() || !credential.trim()) {
      setMessage("Enter your name and stash password first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await queue.current;
      const restored = await restoreBackup(state?.name ?? name, credential);
      setPendingRestore(restored);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not reach the backup server.",
      );
    } finally {
      setBusy(false);
    }
  }
  /** Applies a reviewed restore and saves its device-only credentials. */
  function applyRestore() {
    if (!pendingRestore) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingRestore));
      localStorage.setItem(PASSWORD_KEY, credential);
    } catch {
      setMessage("Unable to save restored data on this device.");
      return;
    }
    setState(pendingRestore);
    setPassword(credential);
    setPendingRestore(null);
    setMessage("Backup restored!");
  }
  /** Updates the password locally; it is never included in a backup payload. */
  function connect() {
    try {
      localStorage.setItem(PASSWORD_KEY, credential);
      setPassword(credential);
      setRetry((v) => v + 1);
      setMessage(
        credential ? "Automatic backup enabled." : "Server backup paused.",
      );
    } catch {
      setMessage("Could not save the password on this device.");
    }
  }
  const restoreConfirmation = pendingRestore && (
    <Modal
      title="Restore this adventure?"
      close={() => setPendingRestore(null)}
    >
      <p>
        Restore {pendingRestore.name}’s {pendingRestore.entries.length}{" "}
        completed goals and {rewards(pendingRestore.entries).medals.length}{" "}
        medals? This replaces the progress on this device.
      </p>
      <div className="actions">
        <button onClick={() => setPendingRestore(null)}>
          Keep this device’s progress
        </button>
        <button className="primary" onClick={applyRestore}>
          Restore backup
        </button>
      </div>
    </Modal>
  );
  if (!state)
    return (
      <main className="welcome">
        <div className="welcome-star">🌟</div>
        <span className="eyebrow">LITTLE ADVENTURES. BIG ACHIEVEMENTS.</span>
        <h1>
          Daily <em>Stars</em>
        </h1>
        <p>
          Do a little good. Make something brilliant.
          <br />
          Build a whole galaxy of you.
        </p>
        <form
          className="setup-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!error && name.trim()) setState(initialState(name));
          }}
        >
          <label htmlFor="name">Hey superstar, what’s your name?</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            placeholder="Your name or nickname"
            autoComplete="given-name"
          />
          <p className="hint">Use a unique nickname for your server backup.</p>
          <button className="primary" disabled={!!error || !name.trim()}>
            Let’s shine <Sparkles size={20} />
          </button>
          <details>
            <summary>Already have a server backup?</summary>
            <label htmlFor="setup-password">Stash password</label>
            <input
              id="setup-password"
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => void restore()}
              disabled={busy}
            >
              {busy ? "Looking for your stars…" : "Find my adventure"}
            </button>
          </details>
          <p role="status">{message}</p>
          {error && <p role="alert">{error}</p>}
        </form>
        {restoreConfirmation}
      </main>
    );
  const reward = rewards(state.entries);
  const selectedDay = dayKey(offset);
  const activeGoals = state.goals.filter((g) => !g.omitted);
  const done = state.entries.filter(
    (e) => e.day === selectedDay && activeGoals.some((g) => g.id === e.goal),
  ).length;
  const size = cells(reward.shape).length;
  const stats = state.goals.map((g) => ({
    ...g,
    count: state.entries.filter(
      (e) =>
        e.goal === g.id &&
        (range === "all" || (e.day >= dayKey(-29) && e.day <= today)),
    ).length,
  }));
  const total = stats.reduce((sum, g) => sum + g.count, 0);
  const maximum = Math.max(1, ...stats.map((g) => g.count));
  return (
    <div className="app">
      <header>
        <a className="brand" href="./">
          <span>✦</span> daily stars<span className="brand-dot">.</span>
        </a>
        <nav aria-label="App tools">
          <button
            className="icon-button"
            aria-label={state.sound ? "Mute sounds" : "Enable sounds"}
            onClick={() => {
              if (state.sound) audio.current?.pause();
              setState({ ...state, sound: !state.sound });
            }}
          >
            {state.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button onClick={() => setModal("stats")}>
            <BarChart3 size={19} />
            <span>My stats</span>
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => {
              setMessage("");
              setModal("settings");
            }}
          >
            <Settings />
          </button>
        </nav>
      </header>
      <main>
        <section className="greeting">
          <div>
            <span className="eyebrow">YOUR EVERYDAY ADVENTURE</span>
            <h1>
              Keep shining, <em>{state.name}!</em>{" "}
              <span className="wave">✌️</span>
            </h1>
            <p>Little things you do. Big things you become.</p>
          </div>
          <button className="medal-pill" onClick={() => setModal("medals")}>
            <span>🏅</span>
            <strong>{reward.medals.length}</strong> medals earned
          </button>
        </section>
        <div className="board">
          <section className="goals-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">ONE LITTLE STEP AT A TIME</span>
                <h2>Your daily adventures</h2>
              </div>
              <span className="count-badge">
                {done}
                <span> / {activeGoals.length}</span>
              </span>
            </div>
            <div className="day-nav">
              <button
                className="icon-button"
                aria-label="Previous day"
                disabled={offset <= -7}
                onClick={() => setOffset(offset - 1)}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <strong>
                  {offset === 0
                    ? "Today"
                    : offset === -1
                      ? "Yesterday"
                      : new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                          "en-GB",
                          { weekday: "long" },
                        )}
                </strong>
                <span>
                  {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long" },
                  )}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label="Next day"
                disabled={offset === 0}
                onClick={() => setOffset(offset + 1)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            {offset < 0 && (
              <p className="backdate">
                A little catch-up counts too.{" "}
                <button className="text-button" onClick={() => setOffset(0)}>
                  Back to today
                </button>
              </p>
            )}
            <div className="goal-grid">
              {activeGoals.map((g) => {
                const checked = state.entries.some(
                  (e) => e.day === selectedDay && e.goal === g.id,
                );
                return (
                  <button
                    key={g.id}
                    className={`goal ${checked ? "checked" : ""}`}
                    style={{ "--goal": g.colour } as CSSProperties}
                    aria-pressed={checked}
                    onClick={() => {
                      commit(toggleGoal(state, g.id, selectedDay));
                      setMessage(
                        checked
                          ? "You can tick that again whenever you’re ready."
                          : [
                              "One little win. One more square!",
                              "Look at you go! ✨",
                              "That’s a little bit of brilliant.",
                              "Your adventure is growing!",
                            ][Math.floor(Math.random() * 4)],
                      );
                      if (!checked && state.sound) chime();
                    }}
                  >
                    <span className="goal-emoji">{g.emoji}</span>
                    <span className="goal-name">{g.name}</span>
                    <span className="tick">
                      {checked && <Check size={17} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeGoals.length === 0 && (
              <p>Choose some adventures in settings to get started.</p>
            )}
            <div className="daily-footer">
              <span aria-live="polite">
                {done === activeGoals.length && done > 0
                  ? "🎉 Every adventure ticked. What a day!"
                  : message || "Every little win adds a splash of colour."}
              </span>
              <button
                className="text-button"
                onClick={() => setModal("settings")}
              >
                Edit goals
              </button>
            </div>
          </section>
          <section className="reward-panel">
            <div className="reward-top">
              <span className="eyebrow">YOUR NEXT MASTERPIECE</span>
              <span className="level">
                NO. {String(reward.medals.length + 1).padStart(2, "0")}
              </span>
            </div>
            <h2>{shapes[reward.shape].name}</h2>
            <p>A little more you, in every square.</p>
            <div className="mosaic-stage">
              <span className="twinkle t1">✦</span>
              <span className="twinkle t2">✧</span>
              <span className="twinkle t3">✦</span>
              <Mosaic
                shape={reward.shape}
                entries={reward.current}
                state={state}
              />
            </div>
            <div className="progress-label">
              <strong>
                {reward.current.length} <span>/ {size} squares</span>
              </strong>
              <span>{Math.round((reward.current.length / size) * 100)}%</span>
            </div>
            <progress
              value={reward.current.length}
              max={size}
              aria-label="Current mosaic progress"
            />
            <p className="reward-hint">
              {size - reward.current.length} little wins until your next medal!
            </p>
            <div className="reward-note">
              <span>🎨</span>
              <p>
                Each goal has its own colour.
                <br />
                <strong>This masterpiece is uniquely yours.</strong>
              </p>
            </div>
          </section>
        </div>
        <footer>
          <span>✦ Small steps. Wonderful things.</span>
          <span role="status">
            {password
              ? sync
              : "Saved on this device · Set up server backup in settings"}
          </span>
        </footer>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
      {modal && (
        <Modal
          title={
            modal === "settings"
              ? "Make it yours"
              : modal === "stats"
                ? "Look how far you’ve come"
                : "Your medal collection"
          }
          close={() => setModal(null)}
        >
          {modal === "settings" && (
            <>
              <p>
                Pick the adventures that feel like you. Hidden goals keep all
                their history.
              </p>
              <div className="settings-goals">
                {state.goals.map((g) => (
                  <div key={g.id} className={g.omitted ? "omitted" : ""}>
                    <span>{g.emoji}</span>
                    <input
                      aria-label={`Goal name: ${g.name}`}
                      value={g.name}
                      maxLength={60}
                      onChange={(e) => {
                        if (e.target.value.trim())
                          setState({
                            ...state,
                            goals: state.goals.map((item) =>
                              item.id === g.id
                                ? { ...item, name: e.target.value }
                                : item,
                            ),
                          });
                      }}
                    />
                    <button
                      onClick={() =>
                        setState({
                          ...state,
                          goals: state.goals.map((item) =>
                            item.id === g.id
                              ? { ...item, omitted: !item.omitted }
                              : item,
                          ),
                        })
                      }
                    >
                      {g.omitted ? "Bring back" : "Hide"}
                    </button>
                  </div>
                ))}
              </div>
              <form
                className="add-goal"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newGoal.trim()) {
                    setState({
                      ...state,
                      goals: [
                        ...state.goals,
                        {
                          id: crypto.randomUUID(),
                          name: newGoal.trim(),
                          emoji: "✨",
                          colour: palette[state.goals.length % palette.length],
                          omitted: false,
                        },
                      ],
                    });
                    setNewGoal("");
                  }
                }}
              >
                <input
                  aria-label="New goal"
                  placeholder="A new little adventure…"
                  maxLength={60}
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                />
                <button className="primary" disabled={!newGoal.trim()}>
                  Add goal
                </button>
              </form>
              <section className="backup">
                <h3>Keep your stars safe</h3>
                <p>
                  Backup name: <strong>{state.name}</strong>. Uses the same
                  stash server as Practice Stars. Restore an existing backup
                  before enabling uploads on a new device.
                </p>
                <label htmlFor="password">Stash password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                />
                <div className="actions">
                  <button onClick={connect}>
                    {" "}
                    {credential
                      ? "Enable backup / save now"
                      : "Pause server backup"}
                  </button>
                  <button
                    disabled={busy || !credential}
                    onClick={() => void restore()}
                  >
                    {busy ? "Fetching…" : "Restore from server"}
                  </button>
                </div>
                <p role="status">{message || sync}</p>
              </section>
            </>
          )}
          {modal === "stats" && (
            <>
              <div className="tabs">
                <button
                  aria-pressed={range === "all"}
                  onClick={() => setRange("all")}
                >
                  All time
                </button>
                <button
                  aria-pressed={range === "30"}
                  onClick={() => setRange("30")}
                >
                  Last 30 days
                </button>
              </div>
              <div className="stat-total">
                <strong>{total}</strong>
                <span>
                  little wins{" "}
                  {range === "30" ? "in the last 30 days" : "and counting"} ✨
                </span>
              </div>
              <div className="stats-list">
                {stats.map((g) => (
                  <div key={g.id}>
                    <div>
                      <span>
                        {g.emoji} {g.name}
                        {g.omitted ? " (hidden)" : ""}
                      </span>
                      <strong>{g.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${(g.count / maximum) * 100}%`,
                          background: g.colour,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="hint">
                One completed goal = one little win. Hidden goals still count.
              </p>
            </>
          )}
          {modal === "medals" && (
            <>
              {reward.medals.length === 0 ? (
                <div className="empty">
                  <Trophy size={60} />
                  <h3>Your first masterpiece is on its way!</h3>
                  <p>Every tick brings you one square closer.</p>
                </div>
              ) : (
                <div className="medals">
                  {reward.medals.map((m, i) => (
                    <div key={i}>
                      <Mosaic
                        small
                        shape={m.shape}
                        entries={m.entries}
                        state={state}
                      />
                      <strong>{shapes[m.shape].name}</strong>
                      <span>
                        Medal {i + 1} · {m.entries.length} wins
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="hint">
                Collect all {shapes.length} designs, then create a new
                colour-filled set.
              </p>
            </>
          )}
        </Modal>
      )}
      {celebration !== null && (
        <Modal
          title="You made something amazing!"
          close={() => {
            setCelebration(null);
            audio.current?.pause();
          }}
        >
          <div className="celebration">
            {Array.from({ length: 45 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  background: palette[i % palette.length],
                  animationDelay: `${(i % 7) * 0.12}s`,
                  transform: `rotate(${i * 23}deg)`,
                }}
              />
            ))}
            <span className="eyebrow">
              A NEW MEDAL FOR {state.name.toUpperCase()}
            </span>
            <Mosaic
              shape={celebration % shapes.length}
              entries={reward.medals[celebration]?.entries ?? []}
              state={state}
            />
            <h2>{shapes[celebration % shapes.length].name} unlocked!</h2>
            <p>Look what all those little wins became.</p>
            <button
              className="primary"
              onClick={() => {
                setCelebration(null);
                audio.current?.pause();
              }}
            >
              On to the next adventure! ✨
            </button>
          </div>
        </Modal>
      )}
      {restoreConfirmation}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
