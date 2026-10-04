/** Coordinates four lesson canvases, chapter navigation and private saved progress. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  RotateCcw,
  Leaf,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { initialSession, settle, goToChapter, type Session } from "./session";
import { unlockSound, muteSound } from "./sound";
import { repeatExperiment } from "./model";
import { loadSession, saveSession } from "./storage";
import { Discover, Instructions } from "./Discover";
import { Offspring } from "./Offspring";
import { Population } from "./Population";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./style.css";

const chapters = [
  {
    name: "Hidden in plain sight",
    short: "Camouflage",
    subtitle: "A little woodland. Eight moths. How many can you see?",
    time: "0–3 minutes",
    question: "Does camouflage have to be perfect to help?",
    try: "Keep the moths in place. Compare both bark colours, then gradually lower the daylight.",
    misconception:
      "The slider changes illumination on the display, not the moths' inherited appearance.",
    note: "This illustrates visibility, not bird vision. Peppered moths rest on trees and face predation in daylight too; dawn and dusk are examples of dim light, not the only dangerous times.",
  },
  {
    name: "Hidden instructions",
    short: "Gene copies",
    subtitle: "What you can see isn't the whole story.",
    time: "3–10 minutes",
    question: "Can two dark moths carry different instructions?",
    try: "Predict each moth from its copies, then tap to reveal. Build a mixed pair and swap its order.",
    misconception:
      "Dark does not mean stronger, better or more likely to be inherited.",
    note: "We model a single diploid colour locus with two versions (alleles). Dark is dominant: a mixed pair looks dark. The three combinations are not a claim about their frequencies in a real population. Cosmetic features are decorative.",
  },
  {
    name: "Meet the offspring",
    short: "Offspring",
    subtitle: "One copy from Mum. One from Dad. A new combination.",
    time: "10–17 minutes",
    question: "Can two dark parents have a light baby?",
    try: "Use two mixed parents. Try a possible light offspring, then let chance choose several broods.",
    misconception:
      "One chance in four does not mean exactly one light baby in each brood of four.",
    note: "Guided births cycle through the four ordered copy choices; they do not enter the chance tally. Random broods independently sample each parent's copies with equal probability. Two mixed parents give 1/4 light offspring per birth. Four-offspring broods are display groups; moths lay many more eggs. The life cycle is compressed. There is no mutation.",
  },
  {
    name: "A changing woodland",
    short: "Generations",
    subtitle: "Who survives, who becomes a parent, and what happens next?",
    time: "17–28 minutes",
    question: "Why does the population change when the woodland changes?",
    try: "Step through one family, then compare the same founders on opposite bark colours. Inspect a survivor's parents.",
    misconception:
      "Birds do not inspect genes, and changing bark does not recolour existing moths.",
    note: "48 parents produce 96 offspring; weighted chance selects 48 survivors. An illustrative search-image rule makes birds focus more on common appearances, so rare appearances tend to persist. This is a teaching heuristic, not a calibrated model of field predation. Real predation does not remove exactly half. Pairing assigns reproductive roles without tracking sex ratios. Hidden light copies may remain in dark moths. Lost versions cannot reappear. During industrial melanism, pollution altered resting backgrounds and which inherited forms were well hidden; soot did not directly recolour moths.",
  },
];

/** Reads only supported chapter links; unrelated or malformed hashes are ignored. */
function hashChapter(): number | null {
  const match = /^#chapter=([1-4])$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

/** Opens an accessible native modal and returns focus to the triggering control. */
function Confirmation({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      onCancel={onCancel}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">Start a fresh experiment?</h2>
      <p>{message}</p>
      <div className="toolbar">
        <button autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" onClick={onConfirm}>
          Continue
        </button>
      </div>
    </dialog>
  );
}

/** Mounts independent chapters with shared navigation, motion preferences and local persistence. */
export function App() {
  const [session, setSession] = useState<Session>(initialSession);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [reduced, setReduced] = useState(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [confirmation, setConfirmation] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const latest = useRef(session);
  const loaded = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  latest.current = session;

  useEffect(() => {
    let active = true;
    loadSession()
      .then((saved) => {
        if (!active) return;
        const next = settle(saved ?? initialSession());
        setSession(
          goToChapter(
            next,
            hashChapter() ?? (next.chapter === 5 ? 1 : next.chapter),
          ),
        );
      })
      .catch((error) => {
        if (active) {
          setSession(goToChapter(initialSession(), hashChapter() ?? 1, false));
          setNotice(
            error instanceof Error && error.message.includes("fresh lesson")
              ? error.message
              : "Progress cannot be saved on this device. You can still explore this lesson.",
          );
        }
      })
      .finally(() => {
        if (active) {
          loaded.current = true;
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Begin each atomic write immediately: a quick reload must not miss a completed action.
    void saveSession(session).catch(() =>
      setNotice(
        "Progress cannot be saved on this device. Keep this page open to continue your lesson.",
      ),
    );
  }, [session, ready]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    /** Follows system accessibility changes without changing simulation state. */
    const changed = () => setReduced(media.matches);
    media.addEventListener("change", changed);
    /** Supports browser back/forward and externally opened chapter links. */
    const hashChanged = () => {
      const chapter = hashChapter();
      if (chapter)
        setSession((current) =>
          current.chapter === chapter ? current : goToChapter(current, chapter),
        );
    };
    window.addEventListener("hashchange", hashChanged);
    /** Flushes the most recent complete event when leaving the page. */
    const leaving = () => {
      if (!loaded.current) return;
      void saveSession(settle(latest.current)).catch(() => {});
    };
    window.addEventListener("pagehide", leaving);
    return () => {
      media.removeEventListener("change", changed);
      window.removeEventListener("hashchange", hashChanged);
      window.removeEventListener("pagehide", leaving);
    };
  }, []);

  /** Performs navigation atomically, settling pending biology and applying newly selected parents. */
  function navigate(chapter: number) {
    setSession((current) => goToChapter(current, chapter));
    window.location.hash = `chapter=${chapter}`;
    setNotes(false);
    window.setTimeout(() => heading.current?.focus(), 0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  /** Queues a reversible reset behind an explicit in-app confirmation. */
  function confirm(message: string, action: () => void) {
    setConfirmation({ message, action });
  }
  /** Resets only the current chapter; other chapter experiments remain intact. */
  function reset() {
    const action = () => {
      setResetEpoch((epoch) => epoch + 1);
      setSession((current) => {
        const defaults = initialSession();
        const key = (["search", "builder", "brood", "woodland"] as const)[
          current.chapter - 1
        ];
        return {
          ...current,
          [key]:
            key === "builder"
              ? { ...defaults.builder, dirty: true }
              : defaults[key],
        };
      });
    };
    if (session.chapter >= 3)
      confirm(
        "Reset this chapter to its starting scene? Its recorded offspring and history will be cleared. Other chapters stay as they are.",
        action,
      );
    else action();
  }
  const chapter = chapters[session.chapter - 1];
  const motion = session.motion && !reduced;
  if (!ready)
    return (
      <main className="loading">
        <img src="./icon.svg" alt="" width="96" height="96" />
        <p>Opening your woodland…</p>
      </main>
    );
  return (
    <div
      className="app"
      data-motion={motion}
      onPointerDown={unlockSound}
      onKeyDown={unlockSound}
    >
      <header className="site-header">
        <a
          className="brand"
          href="#chapter=1"
          onClick={(event) => {
            event.preventDefault();
            navigate(1);
          }}
          aria-label="Moth, first chapter"
        >
          <img src="./icon.svg" alt="" width="48" height="48" />
          <span>
            Moth<small>A little world of big discoveries</small>
          </span>
        </a>
        <div className="header-actions">
          <button
            aria-label={session.muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={session.muted}
            onClick={() => {
              muteSound(!session.muted);
              setSession({ ...session, muted: !session.muted });
            }}
          >
            {session.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}{" "}
            {session.muted ? "Sound off" : "Sound on"}
          </button>
          <button
            aria-pressed={session.motion}
            onClick={() => setSession({ ...session, motion: !session.motion })}
          >
            {motion ? "Motion on" : "Motion off"}
          </button>
          <button aria-expanded={notes} onClick={() => setNotes(!notes)}>
            <BookOpen size={18} />
            Instructor notes
          </button>
        </div>
      </header>
      <nav className="chapter-nav" aria-label="Lesson chapters">
        {chapters.map((item, i) => (
          <button
            key={item.short}
            aria-current={session.chapter === i + 1 ? "step" : undefined}
            onClick={() => navigate(i + 1)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {item.short}
          </button>
        ))}
      </nav>
      <main>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              aria-label="Dismiss storage notice"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="chapter-heading">
          <div>
            <span className="eyebrow">
              <Leaf size={14} />
              Chapter {session.chapter} of 4 · explore together
            </span>
            <h1 tabIndex={-1} ref={heading}>
              {chapter.name}
            </h1>
            <p>{chapter.subtitle}</p>
          </div>
          <button className="reset-button" onClick={reset}>
            <RotateCcw size={16} />
            Reset chapter
          </button>
        </div>
        {notes && (
          <aside className="instructor card">
            <div className="card-heading">
              <h2>For the grown-up</h2>
              <span className="pill">{chapter.time}</span>
            </div>
            <div className="notes-grid">
              <div>
                <h3>Ask</h3>
                <p>{chapter.question}</p>
                <h3>Try</h3>
                <p>{chapter.try}</p>
              </div>
              <div>
                <h3>Listen for</h3>
                <p>{chapter.misconception}</p>
                <h3>About this model</h3>
                <p>{chapter.note}</p>
              </div>
            </div>
            <p className="caption">
              No need to finish every activity. Follow a question, pause for a
              conversation, or jump to another chapter.
            </p>
          </aside>
        )}
        {session.chapter === 1 && (
          <Discover
            state={session.search}
            update={(search) =>
              setSession((current) => ({ ...current, search }))
            }
          />
        )}
        {session.chapter === 2 && (
          <Instructions
            state={session.builder}
            update={(builder) =>
              setSession((current) => ({
                ...current,
                builder: {
                  ...builder,
                  dirty:
                    current.builder.dirty ||
                    builder.parents.some(
                      (pair, i) =>
                        pair.join() !== current.builder.parents[i].join(),
                    ),
                },
              }))
            }
            motion={motion}
          />
        )}
        {session.chapter === 3 && (
          <Offspring
            key={`brood-${session.brood.seed}-${resetEpoch}`}
            state={session.brood}
            update={(brood) => setSession((current) => ({ ...current, brood }))}
            motion={motion}
            confirm={confirm}
          />
        )}
        {session.chapter === 4 && (
          <Population
            key={`woodland-${session.woodland.comparing}-${resetEpoch}`}
            experiments={
              session.woodland.comparing
                ? session.woodland.comparison!
                : [session.woodland.single]
            }
            update={(experiments) =>
              setSession((current) => ({
                ...current,
                woodland: {
                  ...current.woodland,
                  ...(current.woodland.comparing
                    ? { comparison: experiments }
                    : { single: experiments[0] }),
                },
              }))
            }
            speed={session.speeds[0]}
            setSpeed={(speed) =>
              setSession((current) => ({
                ...current,
                speeds: [speed, current.speeds[1]],
              }))
            }
            muted={session.muted}
            many={false}
            suspended={Boolean(confirmation)}
            comparing={session.woodland.comparing}
            onCompare={() =>
              setSession((current) => ({
                ...settle(current),
                woodland: {
                  ...settle(current).woodland,
                  comparing: !current.woodland.comparing,
                  comparison: current.woodland.comparison ?? [
                    repeatExperiment(
                      current.woodland.single,
                      current.woodland.single.run.seed,
                      1,
                    ),
                    repeatExperiment(
                      current.woodland.single,
                      current.woodland.single.run.seed,
                      0,
                    ),
                  ],
                },
              }))
            }
            motion={motion}
            confirm={confirm}
          />
        )}
      </main>
      <footer className="lesson-footer">
        <button
          disabled={session.chapter === 1}
          onClick={() => navigate(session.chapter - 1)}
        >
          <ArrowLeft size={18} />
          Previous chapter
        </button>
        <span>
          <Leaf size={14} /> Take your time. Follow your curiosity.
        </span>
        {session.chapter < 4 ? (
          <button
            className="primary"
            onClick={() => navigate(session.chapter + 1)}
          >
            Next: {chapters[session.chapter].short}
            <ArrowRight size={18} />
          </button>
        ) : (
          <button className="primary" onClick={() => navigate(1)}>
            Explore again
            <ArrowRight size={18} />
          </button>
        )}
      </footer>
      {confirmation && (
        <Confirmation
          message={confirmation.message}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            confirmation.action();
            setConfirmation(null);
          }}
        />
      )}
    </div>
  );
}
