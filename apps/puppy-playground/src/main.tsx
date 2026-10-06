/** A small review app for the puppy's complete animation drafts. */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import clipLibrary from "../../../characters/puppy/library/clips.json";
import { createStage, type Stage, type View } from "./stage";
import "./styles.css";

const groups = [
  { id: "Quiet", label: "Quiet moments" },
  { id: "Minor success", label: "Small wins" },
  { id: "Major success", label: "Big celebrations" },
  { id: "Encouragement", label: "Try again" },
];

/** Mounts the puppy stage and provides labelled animation and review controls. */
function App() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [active, setActive] = useState("neutral");
  const [queued, setQueued] = useState<string | null>(null);
  const [group, setGroup] = useState("Quiet");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("hero");
  const [speed, setSpeed] = useState(1);
  const [motionAllowed, setMotionAllowed] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    try {
      stage.current = createStage(
        host.current!,
        setAvailable,
        (name, pending) => {
          setActive(name);
          setQueued(pending);
        },
        setError,
      );
    } catch {
      setError(
        "This device could not open the 3D view. Please try a browser with WebGL support.",
      );
    }
    return () => stage.current?.dispose();
  }, []);

  useEffect(() => {
    stage.current?.setMotionAllowed(motionAllowed);
  }, [motionAllowed]);
  useEffect(() => {
    stage.current?.setView(view);
  }, [view]);
  useEffect(() => {
    stage.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    /** Follows changes to the system's reduced-motion preference. */
    function updateMotion() {
      setMotionAllowed(!preference.matches);
    }
    preference.addEventListener("change", updateMotion);
    return () => preference.removeEventListener("change", updateMotion);
  }, []);

  const current = clipLibrary.find((clip) => clip.id === active);
  return (
    <main>
      <header>
        <a href="../" className="back">
          ← Kid Apps
        </a>
        <p className="eyebrow">A little companion, in motion</p>
        <h1>
          Puppy Playground<span>🐾</span>
        </h1>
        <p>Meet our puppy. Pick a gentle movement and see what it says.</p>
      </header>
      <div className="playground">
        <section className="stage-panel" aria-label="Puppy preview">
          <div className="badge">Full animation library · drafts</div>
          <div ref={host} className="stage" />
          {error ? (
            <div className="stage-message" role="alert">
              {error}
              <button onClick={() => location.reload()}>
                Reload playground
              </button>
            </div>
          ) : available.length === 0 ? (
            <div className="stage-message" role="status">
              Loading the puppy…
            </div>
          ) : null}
          <div className="stage-bottom">
            <p role="status" aria-live="polite">
              {available.length ? current?.label : "Getting ready…"}
              {active === "Q1" && <span className="loop"> · looping</span>}
              {queued && (
                <small className="queued">
                  Next: {clipLibrary.find((clip) => clip.id === queued)?.label}
                </small>
              )}
            </p>
            <button
              className="reset"
              disabled={!available.length}
              onClick={() => stage.current?.play("neutral")}
            >
              ↺ Neutral stance
            </button>
          </div>
          <fieldset className="views">
            <legend>View</legend>
            {(
              [
                ["hero", "Three-quarter"],
                ["front", "Front"],
                ["side", "Side"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </fieldset>
        </section>
        <section className="controls" aria-labelledby="movements">
          <p className="eyebrow">
            {groups.find((category) => category.id === group)?.label}
          </p>
          <h2 id="movements">Try a movement</h2>
          <p className="hint">
            Each reaction returns to neutral. Breathing loops; bigger movements
            finish their protected section before switching.
          </p>
          <div
            className="categories"
            role="group"
            aria-label="Animation category"
          >
            {groups.map((category) => (
              <button
                key={category.id}
                aria-pressed={group === category.id}
                onClick={() => setGroup(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="clip-list">
            {clipLibrary
              .filter((clip) => clip.group === group)
              .map((clip) => (
                <button
                  className="clip"
                  key={clip.id}
                  disabled={!motionAllowed || !available.includes(clip.id)}
                  aria-pressed={active === clip.id}
                  onClick={() => stage.current?.play(clip.id)}
                >
                  <span className="clip-id">{clip.id.split("-")[0]}</span>
                  <span>
                    <strong>{clip.label}</strong>
                    <small>{clip.description}</small>
                  </span>
                  <span className="duration">{clip.duration} s</span>
                </button>
              ))}
          </div>
          <div className="options">
            <label>
              Playback speed
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                <option value="0.5">Half speed</option>
                <option value="1">Normal speed</option>
                <option value="1.5">One and a half speed</option>
              </select>
            </label>
            <label className="motion">
              <input
                type="checkbox"
                checked={motionAllowed}
                onChange={(event) => setMotionAllowed(event.target.checked)}
              />
              Enable motion previews
            </label>
            {!motionAllowed && (
              <p className="hint">
                Motion is off. Tick the box when you want to review an
                animation.
              </p>
            )}
          </div>
        </section>
      </div>
      <footer>
        Draft movements for review · gentle idle moments, clear celebrations and
        a kind recovery.
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
