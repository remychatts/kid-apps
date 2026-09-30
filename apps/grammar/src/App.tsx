/** Detective desk, accessible word inspection, settings and grammar practice feedback. */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flame,
  Lightbulb,
  Search,
  Settings as Cog,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { entries, guides } from "./content.ts";
import {
  answerQuestion,
  changeSettings,
  CLASS_ORDER,
  nextQuestion,
  readSaved,
  startGame,
  STORAGE_KEY,
  useHelp,
} from "./model.ts";
import { playApplause, playChime, stopApplause } from "./audio.ts";
import type { Entry, Game, Settings, Word, WordClass } from "./types.ts";

const CLASS_LABELS: Record<WordClass, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  determiner: "Determiner",
  pronoun: "Pronoun",
  preposition: "Preposition",
};
const CLASS_COLOURS: Record<WordClass, string> = {
  noun: "#286c9d",
  verb: "#aa3c55",
  adjective: "#6c4c9c",
  adverb: "#20736c",
  determiner: "#936016",
  pronoun: "#9b487c",
  preposition: "#50673b",
};
type Panel = "settings" | "help" | "summary" | "guide" | null;

/** Restores preferences while allowing private browsing and blocked storage. */
function initialGame(): Game {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* Practice still works in memory. */
  }
  return startGame(
    entries,
    readSaved(
      raw,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  );
}

/** Uses a native modal with explicit keyboard wrap, Escape and focus restoration. */
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected && !previous.matches(":disabled"))
        previous.focus();
      else document.getElementById("case-prompt")?.focus();
    };
  }, []);
  /** Keeps Tab at the dialog's boundaries rather than letting it leave the page. */
  function wrapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      ref.current!.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']",
      ),
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby={headingId}
      onKeyDown={wrapFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-top">
        <h2 id={headingId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

/** Displays tappable word tokens and measured, wrap-safe descriptor connections. */
function Sentence({
  entry,
  focusId,
  relationId,
  onWord,
  selectedId,
  wrongId,
}: {
  entry: Entry;
  focusId?: string;
  relationId?: string;
  onWord?: (word: Word) => void;
  selectedId?: string;
  wrongId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const marker = useId().replace(/:/g, "");
  const relation = entry.relationships.find(
    (link) => link.sourceWordId === relationId,
  );
  const targets = relation?.targetWordIds || [];
  useEffect(() => {
    const container = ref.current!;
    /** Measures real word locations rather than assuming one unwrapped sentence line. */
    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const source = container.querySelector<HTMLElement>(
        `[data-word-id="${relationId}"]`,
      );
      if (!source || !targets.length) {
        setPaths([]);
        return;
      }
      const from = source.getBoundingClientRect();
      setPaths(
        targets.flatMap((id) => {
          const target = container.querySelector<HTMLElement>(
            `[data-word-id="${id}"]`,
          );
          if (!target) return [];
          const to = target.getBoundingClientRect();
          const x1 = from.left + from.width / 2 - bounds.left;
          const x2 = to.left + to.width / 2 - bounds.left;
          const y1 = from.top - bounds.top + 2;
          const y2 = to.top - bounds.top + 2;
          const lift = Math.min(y1, y2) - 18;
          return [`M ${x1} ${y1} C ${x1} ${lift}, ${x2} ${lift}, ${x2} ${y2}`];
        }),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [entry, relationId, relation]);
  const tokens = entry.text.match(/\S+/g) || [];
  return (
    <div className="sentence" ref={ref} aria-label="Sentence">
      <svg className="relationship-lines" aria-hidden="true">
        <defs>
          <marker
            id={marker}
            markerWidth="7"
            markerHeight="7"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path
              d="M0,0 L6,3 L0,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        {paths.map((path, i) => (
          <path key={i} d={path} markerEnd={`url(#${marker})`} />
        ))}
      </svg>
      {entry.words.map((word, index) => (
        <button
          key={word.id}
          type="button"
          data-word-id={word.id}
          className={`word ${word.id === focusId ? "word-focus" : ""} ${word.id === relationId ? "word-source" : ""} ${targets.includes(word.id) ? "word-target" : ""} ${word.id === selectedId ? "word-selected" : ""} ${word.id === wrongId ? "word-wrong" : ""}`}
          disabled={!onWord}
          onClick={() => onWord?.(word)}
          aria-label={`${word.word}${word.id === focusId ? ", highlighted word" : ""}${word.id === relationId ? ", describing word" : ""}${targets.includes(word.id) ? ", linked word" : ""}`}
        >
          {tokens[index]}
        </button>
      ))}
    </div>
  );
}

/** Shows definitions only for classes accessible in the current guide. */
function FieldGuide({ classes }: { classes: WordClass[] }) {
  return (
    <div className="guide-list">
      {classes.map((kind) => (
        <article
          key={kind}
          className="guide-item"
          style={{ "--class-colour": CLASS_COLOURS[kind] } as CSSProperties}
        >
          <h3>{CLASS_LABELS[kind]}</h3>
          <p>{guides[kind].definition}</p>
          {guides[kind].examples.map((example) => (
            <p className="guide-example" key={example}>
              {example}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}

/** Provides a short, skippable milestone with three non-flashing visual styles. */
function Celebration({
  streak,
  reducedMotion,
  onClose,
}: {
  streak: number;
  reducedMotion: boolean;
  onClose: () => void;
}) {
  const style = useMemo(
    () => ["confetti", "fireworks", "ribbons"][Math.floor(Math.random() * 3)],
    [],
  );
  const particles = useMemo(
    () =>
      Array.from(
        { length: 42 },
        (_, index) =>
          ({
            "--x": `${(index * 37) % 100}%`,
            "--y": `${(index * 23) % 90}%`,
            "--delay": `${(index % 7) * 0.07}s`,
            "--turn": `${index * 47}deg`,
            "--colour": ["#f9c75c", "#5cc9b5", "#f48f9d", "#8aaceb", "#d1a2f1"][
              index % 5
            ],
          }) as CSSProperties,
      ),
    [],
  );
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => {
      window.clearTimeout(timer);
      stopApplause();
    };
  }, [onClose]);
  return (
    <Modal title="Brilliant detective work!" onClose={onClose}>
      <div className={`celebration ${style} ${reducedMotion ? "still" : ""}`}>
        {!reducedMotion && (
          <div className="particles" aria-hidden="true">
            {particles.map((particle, i) => (
              <i key={i} style={particle} />
            ))}
          </div>
        )}
        <div className="milestone-badge">
          <Trophy size={46} />
          <strong>{streak}</strong>
          <span>IN A ROW</span>
        </div>
        <h3>Case-cracking streak!</h3>
        <p>You’ve reached a streak of {streak}. What a sharp eye!</p>
        <button className="primary-button" onClick={onClose}>
          Keep investigating <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  );
}

/** Runs the two game mechanics and preserves the current case while inspecting words. */
export default function App() {
  const [game, setGame] = useState(initialGame);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<Settings>(game.settings);
  const [inspected, setInspected] = useState<string | undefined>();
  const [milestone, setMilestone] = useState<number | null>(null);
  const [record, setRecord] = useState<number | null>(null);
  const [guideClasses, setGuideClasses] = useState<WordClass[]>([]);
  const [saved, setSaved] = useState(true);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const q = game.question;
  const available = CLASS_ORDER.slice(0, game.settings.level);
  const target = q.entry.words.find((word) => word.id === q.wordId)!;
  const answerWord = q.entry.words.find((word) => word.id === q.answerWordId);
  const clueWord = q.completed ? answerWord : q.attempted ? target : undefined;
  const inspectedWord = q.entry.words.find((word) => word.id === inspected);
  const best = game.bests[String(game.settings.level)] || 0;
  const steps = game.streak % 10;
  const stats = available.map((kind) => ({
    kind,
    ...(game.stats[kind] || { shown: 0, completed: 0, firstCorrect: 0 }),
  }));
  const completed = stats.reduce((sum, s) => sum + s.completed, 0);
  const correct = stats.reduce((sum, s) => sum + s.firstCorrect, 0);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ settings: game.settings, bests: game.bests }),
      );
      setSaved(true);
    } catch {
      setSaved(false);
    }
    if (!game.settings.sound) stopApplause();
  }, [game.settings, game.bests]);
  useEffect(() => {
    if (q.completed && !panel && !milestone) nextRef.current?.focus();
  }, [q.completed, panel, milestone]);
  useEffect(() => {
    if (!record || panel || milestone) return;
    const timer = window.setTimeout(() => setRecord(null), 6500);
    return () => window.clearTimeout(timer);
  }, [record, panel, milestone]);
  useEffect(() => {
    /** Stops applause if the tab is hidden mid-celebration. */
    const stopWhenHidden = () => {
      if (document.hidden) stopApplause();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      stopApplause();
    };
  }, []);

  /** Celebrates a completed personal best, including streaks ended by help or a level change. */
  function celebrateRecord(result: Game) {
    if (!result.endedRecord) return;
    setRecord(result.endedRecord);
    if (result.settings.sound) playChime();
  }

  /** Applies one answer atomically; visual and audio rewards follow the same first-attempt rule. */
  function submit(answer: string) {
    if (q.completed) return;
    const result = answerQuestion(game, answer);
    setGame(result);
    celebrateRecord(result);
    if (result.question.completed) {
      const first = !q.attempted && !q.usedHelp;
      if (game.settings.sound) playChime(!first);
      if (first && result.streak % 10 === 0) {
        setMilestone(result.streak);
        if (game.settings.sound) playApplause();
      }
    }
  }

  /** Inspects all word classes without changing the current sentence or question. */
  function openHelp() {
    const result = useHelp(game);
    setGame(result);
    celebrateRecord(result);
    setInspected(undefined);
    setPanel("help");
  }

  /** Applies a changed level and introduces only the newly accessible classes. */
  function saveSettings() {
    const result = changeSettings(game, draft, entries);
    setGame(result);
    celebrateRecord(result);
    if (draft.level > game.settings.level) {
      setGuideClasses(CLASS_ORDER.slice(game.settings.level, draft.level));
      setPanel("guide");
    } else setPanel(null);
  }

  /** Advances deliberately, leaving feedback visible until the student is ready. */
  function advance() {
    setGame(nextQuestion(game, entries));
    window.requestAnimationFrame(() => promptRef.current?.focus());
  }

  /** Dismisses both the visual celebration and its long audio reward. */
  function dismissMilestone() {
    setMilestone(null);
    stopApplause();
  }

  return (
    <div
      className={`app ${game.settings.reducedMotion ? "reduced-motion" : ""}`}
    >
      <header className="app-header">
        <a className="brand" href="./" aria-label="Word Detective home">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <span>
            Word<span className="brand-second">Detective</span>
          </span>
        </a>
        <div className="header-tools">
          <button
            className="icon-button inspect-button"
            onClick={openHelp}
            aria-label="Inspect words with the magnifying glass"
            title="Inspect any word"
          >
            <Search size={25} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setDraft({ ...game.settings });
              setPanel("settings");
            }}
            aria-label="Settings"
            title="Settings"
          >
            <Cog size={24} />
          </button>
        </div>
      </header>

      <main>
        <section className="desk-heading">
          <div>
            <p className="eyebrow">
              <span /> THE SENTENCE INVESTIGATION AGENCY
            </p>
            <h1>
              Small words.
              <br />
              <span>Big discoveries.</span>
            </h1>
            <p className="intro">Follow the clues. Crack the sentence case.</p>
          </div>
          <div className="detective-seal" aria-hidden="true">
            <Search size={42} />
            <span>
              SHARP EYES
              <br />
              CURIOUS MINDS
            </span>
            <Star className="seal-star" size={18} />
          </div>
        </section>

        <div className="workspace">
          <section className="case-card" aria-labelledby="case-prompt">
            <div className="case-topline">
              <span className="case-label">
                CASE {String(game.caseNumber).padStart(3, "0")}{" "}
                <span> / {q.entry.category}</span>
              </span>
              <span className="level-tag">Level {game.settings.level}</span>
            </div>
            <div className="mission-label">
              <Search size={16} />{" "}
              {q.mode === "identify"
                ? "NAME THE WORD CLASS"
                : "FIND THE EVIDENCE"}
            </div>
            <h2 id="case-prompt" ref={promptRef} tabIndex={-1}>
              {q.mode === "identify" ? (
                <>
                  What kind of word is <mark>{target.word}</mark>?
                </>
              ) : (
                <>
                  Find{" "}
                  <span style={{ color: CLASS_COLOURS[q.wordClass] }}>
                    a{["adjective", "adverb"].includes(q.wordClass) ? "n" : ""}{" "}
                    {q.wordClass}
                  </span>
                  .
                </>
              )}
            </h2>
            <p className="mission-instruction">
              {q.mode === "identify"
                ? "Read the whole sentence, then choose below."
                : "Tap any word that fits. There may be more than one."}
            </p>

            <div className="sentence-paper">
              <span className="paper-label">THE SENTENCE</span>
              <Sentence
                entry={q.entry}
                focusId={q.mode === "identify" ? q.wordId : undefined}
                relationId={clueWord?.id}
                selectedId={q.answerWordId}
                wrongId={q.mode === "find" ? q.wrongAnswer : undefined}
                onWord={
                  q.mode === "find" && !q.completed
                    ? (word) => submit(word.id)
                    : undefined
                }
              />
            </div>

            {q.mode === "identify" && (
              <div className="answer-options" aria-label="Choose a word class">
                {available.map((kind, index) => (
                  <button
                    key={kind}
                    disabled={q.completed}
                    className={`class-option ${q.completed && kind === q.wordClass ? "option-correct" : ""} ${q.wrongAnswer === kind ? "option-wrong" : ""}`}
                    style={
                      { "--class-colour": CLASS_COLOURS[kind] } as CSSProperties
                    }
                    onClick={() => submit(kind)}
                  >
                    <span className="option-number">{index + 1}</span>
                    {CLASS_LABELS[kind]}
                    {q.completed && kind === q.wordClass ? (
                      <Check size={19} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div
              className={`feedback ${q.completed ? (!q.attempted && !q.usedHelp ? "feedback-success" : "feedback-supported") : q.attempted ? "feedback-clue" : "feedback-waiting"}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {q.completed ? (
                <>
                  <div className="feedback-icon">
                    <Check size={24} />
                  </div>
                  <div>
                    <strong>
                      {!q.attempted && !q.usedHelp
                        ? "Case cracked! +1 point"
                        : "You found it. Nice investigating!"}
                    </strong>
                    <p>{answerWord?.explanation}</p>
                    {(q.attempted || q.usedHelp) && (
                      <span className="feedback-note">
                        Your new streak starts at 1.
                      </span>
                    )}
                  </div>
                </>
              ) : q.attempted ? (
                <>
                  <div className="feedback-icon">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <strong>A clue for your next guess</strong>
                    <p>{target.hint}</p>
                    <span className="feedback-note">
                      Take another look. You can try again.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Lightbulb size={19} />
                  <p>
                    {q.usedHelp
                      ? "You’ve explored the clues. Try your answer when you’re ready."
                      : "Detective tip: a word’s job depends on its sentence."}
                  </p>
                </>
              )}
            </div>
            {clueWord &&
              q.entry.relationships.some(
                (r) => r.sourceWordId === clueWord.id && r.scope === "word",
              ) && (
                <div className="relationship-key">
                  <span className="key-source" /> Describing word{" "}
                  <span className="key-target" /> Word it describes
                </div>
              )}
            {q.completed && (
              <button
                ref={nextRef}
                className="primary-button next-button"
                onClick={advance}
              >
                Next case <ArrowRight size={19} />
              </button>
            )}
          </section>

          <aside
            className="detective-notebook"
            aria-label="Your detective notebook"
          >
            <div className="notebook-heading">
              <span className="eyebrow">YOUR NOTEBOOK</span>
              <Sparkles size={22} />
            </div>
            <div className="points-row">
              <span className="stat-icon">
                <Star size={25} />
              </span>
              <div>
                <strong>{game.points}</strong>
                <span>points this session</span>
              </div>
            </div>
            <div className="notebook-rule" />
            <div className="streak-row">
              <Flame size={23} />
              <span>Current streak</span>
              <strong>{game.streak}</strong>
            </div>
            <div
              className="streak-dots"
              role="img"
              aria-label={`${steps === 0 && game.streak > 0 ? 10 : steps} steps towards your next ten-streak celebration`}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < (steps === 0 && game.streak > 0 ? 10 : steps)
                      ? "filled"
                      : ""
                  }
                />
              ))}
            </div>
            <p className="streak-caption">
              {game.streak > 0 && steps === 0
                ? "Ten more? The next mystery awaits."
                : `${10 - steps} to your next big celebration`}
            </p>
            <div className="best-row">
              <Trophy size={19} />
              <span>Best at level {game.settings.level}</span>
              <strong>{best}</strong>
            </div>
            <div className="notebook-rule" />
            <span className="eyebrow">YOUR WORD TOOLKIT</span>
            <div className="toolkit">
              {available.map((kind) => (
                <span
                  key={kind}
                  style={
                    { "--class-colour": CLASS_COLOURS[kind] } as CSSProperties
                  }
                >
                  {CLASS_LABELS[kind]}
                </span>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => {
                setGuideClasses(available);
                setPanel("guide");
              }}
            >
              Open your field guide <ArrowRight size={16} />
            </button>
            <button
              className="summary-button"
              onClick={() => setPanel("summary")}
            >
              Your discoveries <span>{completed}</span>
              <ChevronRight size={17} />
            </button>
          </aside>
        </div>
        <footer>
          <span>
            <Search size={15} /> Stuck? Your magnifying glass can inspect any
            word.
          </span>
          <span>
            {game.settings.sound ? (
              <Volume2 size={15} />
            ) : (
              <VolumeX size={15} />
            )}{" "}
            {game.settings.sound ? "Sound on" : "Sound off"}
          </span>
        </footer>
        {!saved && (
          <p className="storage-notice" role="status">
            Your browser couldn’t save settings or records. You can still play
            this session.
          </p>
        )}
      </main>

      {record && (
        <div className="record-toast" role="status">
          <Trophy size={25} />
          <div>
            <strong>A new personal best!</strong>
            <span>
              Your streak reached {record}. That’s one for the notebook.
            </span>
          </div>
          <button
            className="icon-button"
            aria-label="Dismiss record celebration"
            onClick={() => setRecord(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {panel === "settings" && (
        <Modal title="Detective settings" onClose={() => setPanel(null)}>
          <p className="modal-intro">
            Choose your challenge. Every level adds another word class to your
            toolkit.
          </p>
          <fieldset className="levels">
            <legend>Complexity level</legend>
            {CLASS_ORDER.map((kind, index) => (
              <label
                key={kind}
                className={
                  draft.level === index + 1
                    ? "level-choice chosen"
                    : "level-choice"
                }
              >
                <input
                  type="radio"
                  name="level"
                  value={index + 1}
                  checked={draft.level === index + 1}
                  onChange={() => setDraft({ ...draft, level: index + 1 })}
                />
                <span className="level-number">{index + 1}</span>
                <span>
                  <strong>{CLASS_LABELS[kind]}</strong>
                  <small>
                    {index === 0
                      ? "Nouns only"
                      : `Adds ${kind}s · includes earlier classes`}
                  </small>
                </span>
                {draft.level === index + 1 && <Check size={20} />}
              </label>
            ))}
          </fieldset>
          <label className="toggle-row">
            <span>
              <strong>Reward sounds</strong>
              <small>Chimes and applause</small>
            </span>
            <input
              type="checkbox"
              checked={draft.sound}
              onChange={(event) =>
                setDraft({ ...draft, sound: event.target.checked })
              }
            />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Reduced motion</strong>
              <small>Still celebrations, fewer moving things</small>
            </span>
            <input
              type="checkbox"
              checked={draft.reducedMotion}
              onChange={(event) =>
                setDraft({ ...draft, reducedMotion: event.target.checked })
              }
            />
          </label>
          <p className="settings-note">
            Changing level starts a fresh case and streak. Your best streak is
            saved separately for each level.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setPanel(null)}>
              Cancel
            </button>
            <button className="primary-button" onClick={saveSettings}>
              Save settings <Check size={18} />
            </button>
          </div>
        </Modal>
      )}

      {panel === "help" && (
        <Modal
          title="Magnifying-glass mode"
          onClose={() => setPanel(null)}
          wide
        >
          <p className="modal-intro">
            Tap any word to discover its job in this sentence, even if it’s
            beyond your current level.{" "}
            {q.completed
              ? "Your solved case and its reward stay the same."
              : "This is supported practice: answering afterwards starts a new streak at 1."}
          </p>
          <div className="inspection-paper">
            <span className="paper-label">
              THE SAME CASE · LOOK A LITTLE CLOSER
            </span>
            <Sentence
              entry={q.entry}
              selectedId={inspected}
              relationId={inspectedWord?.id}
              onWord={(word) => setInspected(word.id)}
            />
          </div>
          <div
            className="inspection-answer"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {inspectedWord ? (
              <>
                <span
                  className="answer-class"
                  style={{ color: CLASS_COLOURS[inspectedWord.wordClass] }}
                >
                  {CLASS_LABELS[inspectedWord.wordClass]}
                </span>
                <h3>“{inspectedWord.word}”</h3>
                <p>{inspectedWord.explanation}</p>
              </>
            ) : (
              <>
                <Search size={34} />
                <h3>Every word has a story.</h3>
                <p>Choose a word above to uncover its word class.</p>
              </>
            )}
          </div>
          {inspectedWord &&
            q.entry.relationships.some(
              (r) => r.sourceWordId === inspectedWord.id && r.scope === "word",
            ) && (
              <div className="relationship-key">
                <span className="key-source" /> Describing word{" "}
                <span className="key-target" /> Word it describes
              </div>
            )}
          <div className="modal-actions">
            <button className="primary-button" onClick={() => setPanel(null)}>
              Cancel inspection · back to the case <ArrowRight size={18} />
            </button>
          </div>
        </Modal>
      )}

      {panel === "guide" && (
        <Modal
          title="Your detective field guide"
          onClose={() => setPanel(null)}
        >
          <p className="modal-intro">
            Look for what the word does in its sentence. Its position or
            spelling is only a clue.
          </p>
          <FieldGuide classes={guideClasses} />
          <button
            className="primary-button full-button"
            onClick={() => setPanel(null)}
          >
            Ready to investigate <ArrowRight size={18} />
          </button>
        </Modal>
      )}

      {panel === "summary" && (
        <Modal title="Your discoveries" onClose={() => setPanel(null)}>
          <p className="modal-intro">
            {completed
              ? `You’ve solved ${completed} cases across your current toolkit: ${correct} independently on the first attempt. Every clue helps you learn.`
              : "Your notebook is ready. Solve a case to start collecting discoveries."}
          </p>
          <div className="summary-list">
            {stats.map((s) => (
              <article key={s.kind}>
                <div>
                  <strong>{CLASS_LABELS[s.kind]}</strong>
                  <span>
                    {s.completed
                      ? `${s.firstCorrect} out of ${s.completed} first time`
                      : "Ready to explore"}
                  </span>
                </div>
                <progress
                  aria-label={`${s.kind} first-attempt accuracy`}
                  max={Math.max(1, s.completed)}
                  value={s.firstCorrect}
                />
              </article>
            ))}
          </div>
          <p className="settings-note">
            This summary covers this session. Points reward independent answers;
            your best streaks stay saved.
          </p>
          <button
            className="primary-button full-button"
            onClick={() => setPanel(null)}
          >
            Back to the case <ArrowRight size={18} />
          </button>
        </Modal>
      )}

      {milestone !== null && (
        <Celebration
          streak={milestone}
          reducedMotion={game.settings.reducedMotion}
          onClose={dismissMilestone}
        />
      )}
    </div>
  );
}
