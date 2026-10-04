/** Population experiments with teaching phases, shared-scale history and recorded ancestry. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  StepForward,
  SkipForward,
  GitBranch,
  RotateCcw,
  Bird,
  Eye,
  ArrowLeft,
} from "lucide-react";
import {
  advance,
  step,
  finish,
  living,
  mean,
  distribution,
  findMoth,
  repeatExperiment,
  LIMIT,
  type Experiment,
  type Generation,
  type Individual,
  type Run,
} from "./model";
import { generationTone } from "./sound";
import {
  Bark,
  Silhouette,
  Specimen,
  Genes,
  Slider,
  Thought,
  cssVars,
  shadeColour,
} from "./ui";
import { barkColour } from "./palette";

/** Displays every living shade on a stable nine-bin scale with an accessible summary. */
function Distribution({ generation }: { generation: Generation }) {
  const bins = distribution(generation);
  return (
    <div
      className="distribution"
      role="img"
      aria-label={`Generation ${generation.number}: ${bins.map((count, i) => `${count} in shade group ${i + 1} of 9`).join(", ")}; groups run dark to light.`}
    >
      {bins.map((count, i) => (
        <div key={i} className="distribution-column">
          <span>{count || ""}</span>
          <i
            style={{
              height: `${(count / 48) * 56}px`,
              background: shadeColour(i / 8),
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Plots actual spreads across time, retaining environment changes and a shared shade scale. */
function History({
  run,
  selected,
  onSelect,
}: {
  run: Run;
  selected: number;
  onSelect: (generation: number) => void;
}) {
  const count = run.history.length;
  const gap = (run.history[1]?.number ?? 1) > 1;
  /** Separates the founder snapshot from the rolling, uniformly spaced recent history. */
  const xAt = (index: number) =>
    gap
      ? index === 0
        ? 12
        : 42 + ((index - 1) / Math.max(1, count - 2)) * 546
      : 12 + (index / Math.max(1, count - 1)) * 576;
  return (
    <div className="history">
      <div className="card-heading">
        <span className="eyebrow">A population through time</span>
        <small>Light ↑</small>
      </div>
      <svg
        viewBox="0 0 600 110"
        role="img"
        aria-label={`History of ${count} generations. Select a generation below for its population and distribution.`}
      >
        {[10, 50, 90].map((y) => (
          <line
            key={y}
            x1="12"
            x2="588"
            y1={y}
            y2={y}
            stroke="#d6dfcc"
            strokeDasharray="3 5"
          />
        ))}
        {run.history.map((gen, i) => {
          const x = xAt(i);
          const bins = distribution(gen);
          return (
            <g key={i}>
              {bins.map(
                (n, shade) =>
                  n > 0 && (
                    <circle
                      key={shade}
                      cx={x}
                      cy={90 - shade * 10}
                      r={Math.min(count < 30 ? 6 : 2.5, 1.5 + n / 12)}
                      fill="#5b7555"
                      opacity={0.25 + n / 65}
                    />
                  ),
              )}
              {i > 0 &&
                gen.number === run.history[i - 1].number + 1 &&
                gen.bark !== run.history[i - 1].bark && (
                  <path
                    d={`M${x} 2v96`}
                    stroke="#be7524"
                    strokeDasharray="2 3"
                  />
                )}
            </g>
          );
        })}
        <polyline
          points={run.history
            .map((gen, i) =>
              gap && i === 0 ? "" : `${xAt(i)},${90 - mean(gen) * 80}`,
            )
            .join(" ")}
          fill="none"
          stroke="#304c39"
          strokeWidth="1.5"
        />
        <line
          x1={xAt(selected)}
          x2={xAt(selected)}
          y1="1"
          y2="100"
          stroke="#b46826"
          strokeWidth="2"
        />
      </svg>
      <div className="dark-axis-label">Dark ↓</div>
      {gap && (
        <p className="caption">
          Start · gap · generations {run.history[1].number}–
          {run.history.at(-1)!.number}
        </p>
      )}
      <label className="history-slider">
        Inspect generation <strong>{run.history[selected].number}</strong>
        <input
          aria-label="Inspect generation"
          type="range"
          min="0"
          max={count - 1}
          value={selected}
          aria-valuetext={`Generation ${run.history[selected].number}`}
          onChange={(e) => onSelect(Number(e.target.value))}
        />
      </label>
      <details>
        <summary>Generation list and bark changes</summary>
        <div className="generation-list">
          {run.history.map((gen, i) => (
            <button key={i} onClick={() => onSelect(i)}>
              Generation {gen.number} · average shade{" "}
              {Math.round(mean(gen) * 100)}% light
              {i > 0 && gen.bark !== run.history[i - 1].bark
                ? " · bark changed"
                : ""}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Shows parents from actual records, including siblings that did not survive. */
function Family({
  run,
  moth,
  onSelect,
  onClose,
  motion,
  survivalKnown = true,
}: {
  run: Run;
  moth: Individual;
  onSelect: (id: string) => void;
  onClose: () => void;
  motion: boolean;
  survivalKnown?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [moth.id]);
  const generation = run.history.find((gen) => gen.number === moth.generation)!;
  const parents = moth.parents?.map((id) => findMoth(run, id)) ?? [];
  const siblings = generation.offspring.filter(
    (other) => other.parents?.join() === moth.parents?.join(),
  );
  return (
    <section className="family-inspector card" aria-label="Family inspection">
      <div className="card-heading">
        <div>
          <span className="eyebrow">One line of ancestors</span>
          <h3 ref={heading} tabIndex={-1}>
            Moth {moth.id} · generation {moth.generation}
          </h3>
        </div>
        <button onClick={onClose}>Close family</button>
      </div>
      <div className="ancestry-row">
        {parents.length ? (
          parents.map(
            (parent, i) =>
              parent && (
                <button
                  className="ancestor"
                  key={parent.id}
                  onClick={() => onSelect(parent.id)}
                >
                  <small>
                    {i ? "Dad" : "Mum"} · generation {parent.generation}
                  </small>
                  <Specimen moth={parent} motion={motion} />
                  {run.model === "single" && (
                    <Genes genes={parent.genes} origin={false} />
                  )}
                  <span>Follow {parent.id}</span>
                </button>
              ),
          )
        ) : (
          <p>
            This is a founding moth. Its parents are outside this experiment.
          </p>
        )}
        {moth.parents && parents.some((parent) => !parent) && (
          <p>
            These parents are older than the retained ancestry window. Their
            identities are {moth.parents.join(" and ")}.
          </p>
        )}
        <div className="selected-descendant">
          <small>Selected offspring</small>
          <Specimen moth={moth} motion={motion} />
          {run.model === "single" && <Genes genes={moth.genes} />}
          <strong>
            {!survivalKnown
              ? "Waiting for survival"
              : generation.survivors.includes(moth.id)
                ? "Survived to become a parent"
                : "Did not survive"}
          </strong>
        </div>
      </div>
      {moth.parents && (
        <details>
          <summary>All four siblings, including those eaten</summary>
          <div className="sibling-list">
            {siblings.map((other) => (
              <button key={other.id} onClick={() => onSelect(other.id)}>
                <Silhouette shade={other.shade} />
                <span>
                  {other.id} ·{" "}
                  {!survivalKnown
                    ? "Waiting for survival"
                    : generation.survivors.includes(other.id)
                      ? "Survived"
                      : "Eaten"}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}
      <p className="caption">
        Every link is a recorded parent. Following one parent traces one line,
        not the whole family tree.
      </p>
    </section>
  );
}

/** Renders a population at a completed generation or a clearly labelled teaching phase. */
function WoodlandCanvas({
  experiment,
  view,
  inside,
  onSelect,
  motion = false,
  tempo = 1,
}: {
  experiment: Experiment;
  motion?: boolean;
  tempo?: number;
  view: number | null;
  inside: boolean;
  onSelect: (id: string) => void;
}) {
  const last = experiment.run.history.at(-1)!;
  const generation =
    view === null ? (experiment.pending ?? last) : experiment.run.history[view];
  const phase = view === null ? experiment.phase : 0;
  const moths = phase ? generation.offspring : living(generation);
  const grid = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    if (!grid.current) return;
    const rectangles = new Map<string, { x: number; y: number }>();
    const animations: Animation[] = [];
    const origin = grid.current.getBoundingClientRect();
    for (const button of grid.current.querySelectorAll<HTMLElement>(
      ".population-moth",
    )) {
      const id = button.dataset.moth!;
      const bounds = button.getBoundingClientRect();
      const rect = { x: bounds.x - origin.x, y: bounds.y - origin.y };
      rectangles.set(id, rect);
      const before = previous.current.get(id);
      if (!motion || view !== null) continue;
      if (before && phase === 0)
        animations.push(
          button.animate(
            [
              {
                transform: `translate(${before.x - rect.x}px, ${before.y - rect.y}px)`,
              },
              { transform: "translate(0, 0)" },
            ],
            { duration: 650 * tempo, easing: "ease-in-out" },
          ),
        );
      else if (!before && phase === 1)
        animations.push(
          button.animate(
            [
              { transform: "scale(.02)", opacity: 0 },
              { transform: "scale(1)", opacity: 1 },
            ],
            {
              duration: 650 * tempo,
              delay: 550 * tempo,
              fill: "backwards",
              easing: "ease-out",
            },
          ),
        );
    }
    previous.current = rectangles;
    return () => animations.forEach((animation) => animation.cancel());
  }, [generation, phase, motion, tempo, view]);
  const surviving = new Set(generation.survivors);
  const eaten = generation.offspring.filter((moth) => !surviving.has(moth.id));
  const counts = living(generation);
  const light = counts.filter((m) => m.shade === 1).length;
  const lightCopies = counts.reduce(
    (sum, moth) => sum + moth.genes.filter(Boolean).length,
    0,
  );
  const totalCopies = counts.length * counts[0].genes.length;
  const fixed = counts[0].genes.every((_, copy) => {
    if (copy % 2) return true;
    const versions = new Set(
      counts.flatMap((moth) => moth.genes.slice(copy, copy + 2)),
    );
    return versions.size === 1;
  });
  const bark = phase
    ? generation.bark
    : view === null
      ? experiment.bark
      : generation.bark;
  return (
    <div className="woodland-canvas">
      <div className="woodland-heading">
        <span className="pill">
          {phase
            ? `Generation ${last.number} → ${generation.number}`
            : `Generation ${generation.number}`}
        </span>
        <span>
          {phase === 1
            ? "96 offspring · one family enlarged below"
            : phase === 2
              ? "48 eaten · 48 survive"
              : "48 parents"}
        </span>
      </div>
      <div
        className={`population-scene phase-${phase}`}
        style={cssVars({
          "--bark": barkColour(bark),
          "--tempo": tempo,
        })}
      >
        <Bark shade={bark} />
        <div
          ref={grid}
          className={`population-grid ${phase ? "offspring-grid" : ""}`}
        >
          {moths.map((moth) => (
            <button
              key={moth.id}
              data-moth={moth.id}
              style={cssVars({
                // Six waves of eight strikes leave time to see each bird approach and feed.
                "--bird-delay": `${650 + Math.floor(eaten.indexOf(moth) / 8) * 650 + (eaten.indexOf(moth) % 8) * 60}ms`,
              })}
              className={`population-moth ${phase === 2 && !surviving.has(moth.id) ? "eaten" : ""}`}
              aria-label={`Moth ${moth.id}, ${experiment.run.model === "single" ? (moth.shade ? "light" : "dark") : `${Math.round(moth.shade * 100)}% light shade`}${phase === 2 && !surviving.has(moth.id) ? ", eaten" : ""}`}
              onClick={() => onSelect(moth.id)}
            >
              <Silhouette shade={moth.shade} seed={moth.cosmetic} />
              {phase === 2 && !surviving.has(moth.id) && (
                <Bird className="bird-strike" size={48} aria-hidden="true" />
              )}
              {inside && experiment.run.model === "single" && (
                <span className="tiny-genes">
                  {moth.genes.map((g, i) => (
                    <i key={i} className={g ? "light" : "dark"}>
                      {g ? "L" : "D"}
                    </i>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {!phase && (
        <div className="population-summary">
          {experiment.run.model === "single" ? (
            <>
              <span>
                <i className="dot light" />
                {light} light
              </span>
              <span>
                <i className="dot dark" />
                {48 - light} dark
              </span>
              <span>Tap a moth to inspect its family</span>
            </>
          ) : (
            <>
              <Distribution generation={generation} />
              <span>
                Dark → Light
                <br />
                Tap a moth to trace its family
              </span>
            </>
          )}
        </div>
      )}
      {!phase && fixed && (
        <p className="variation-note">
          The available versions are now fixed. Changing bark cannot add a
          missing version. Reset to explore the starting variation again.
        </p>
      )}
      {!phase && inside && experiment.run.model === "single" && (
        <p className="caption">
          Inside this population: {lightCopies} light copies and{" "}
          {totalCopies - lightCopies} dark copies.
          {light === 0 && lightCopies > 0
            ? " All wings are dark, but light versions are still hidden inside."
            : ""}
        </p>
      )}
    </div>
  );
}

/** Coordinates playback and inspection while preserving generation-boundary changes. */
export function Population({
  experiments,
  update,
  many,
  comparing,
  onCompare,
  motion,
  confirm,
  suspended = false,
  speed,
  setSpeed,
  muted,
}: {
  speed: string;
  setSpeed: (speed: string) => void;
  muted: boolean;
  experiments: Experiment[];
  update: (experiments: Experiment[]) => void;
  many: boolean;
  comparing: boolean;
  suspended?: boolean;
  onCompare?: () => void;
  motion: boolean;
  confirm: (message: string, action: () => void) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [inside, setInside] = useState(true);
  const [view, setView] = useState<number | null>(null);
  const [selection, setSelection] = useState<{
    side: number;
    id: string;
  } | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [compareStart, setCompareStart] = useState(false);
  const first = experiments[0];
  const latest = first.run.history.length - 1;
  const capped = !many && latest >= LIMIT && !first.pending;
  const tempo = speed === "Fast" ? 0.3 : speed === "Medium" ? 0.6 : 1;
  const generationNumber = first.run.history.at(-1)!.number;
  const sounded = useRef(generationNumber);
  useEffect(() => {
    if (generationNumber > sounded.current)
      experiments.forEach((experiment) =>
        generationTone(mean(experiment.run.history.at(-1)!), muted),
      );
    sounded.current = generationNumber;
  }, [generationNumber, experiments, muted]);
  const selectedRun = selection ? experiments[selection.side]?.run : undefined;
  // A pending generation is already computed and can be inspected without changing its biology.
  const inspectionRun =
    selection && experiments[selection.side]?.pending
      ? finish(experiments[selection.side]).run
      : selectedRun;
  const selected =
    selection && inspectionRun
      ? findMoth(inspectionRun, selection.id)
      : undefined;

  const playback = useRef({ experiments, update, muted });
  playback.current = { experiments, update, muted };
  useEffect(() => {
    if (!playing || suspended) return;
    if (!replaying && capped) {
      setPlaying(false);
      return;
    }
    const schedule =
      many && !replaying ? window.setInterval : window.setTimeout;
    const timer = schedule(
      () => {
        if (replaying) {
          if ((view ?? 0) >= latest) {
            setPlaying(false);
            setReplaying(false);
            setView(null);
          } else {
            const next = (view ?? 0) + 1;
            setView(next);
            playback.current.experiments.forEach((experiment) =>
              generationTone(
                mean(
                  experiment.run.history[
                    Math.min(next, experiment.run.history.length - 1)
                  ],
                ),
                playback.current.muted,
              ),
            );
          }
        } else
          playback.current.update(
            playback.current.experiments.map(
              many || speed !== "Slow" ? advance : step,
            ),
          );
      },
      many
        ? speed === "Fast"
          ? 25
          : speed === "Medium"
            ? 50
            : 100
        : !replaying && speed === "Slow"
          ? first.phase === 2
            ? 6600
            : first.phase === 1
              ? 1500
              : 800
          : 1800 * tempo,
    );
    return () => window.clearInterval(timer);
  }, [
    playing,
    speed,
    comparing,
    capped,
    replaying,
    view,
    latest,
    suspended,
    many,
    first.phase,
    tempo,
  ]);
  useEffect(() => {
    /** Hidden tabs stop playback without accumulating elapsed time. */
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  /** Returns controls to the latest live population before changing its future. */
  function live() {
    setPlaying(false);
    setReplaying(false);
    setView(null);
    setSelection(null);
    setCompareStart(false);
  }
  /** Selects a real record and pauses before inspection. */
  function inspect(id: string, side = 0) {
    setPlaying(false);
    setSelection({ side, id });
    setTrail([id]);
  }
  /** Preserves existing biology and queues the new background at the next cycle. */
  function bark(value: number, side: number) {
    if (!playing) {
      setView(null);
      setReplaying(false);
      setSelection(null);
      setCompareStart(false);
    }
    update(
      experiments.map((exp, i) => (i === side ? { ...exp, bark: value } : exp)),
    );
  }
  /** Restarts from the same founders, either replaying or using fresh random outcomes. */
  function restart(fresh: boolean) {
    setPlaying(false);
    if (!fresh) {
      update(experiments.map(finish));
      setSelection(null);
      setCompareStart(false);
      setView(0);
      setReplaying(true);
      setPlaying(true);
      return;
    }
    confirm(
      "Clear this history and repeat from the same starting moths with fresh chance?",
      () => {
        live();
        update(
          experiments.map((exp) => repeatExperiment(exp, exp.run.seed + 1)),
        );
      },
    );
  }
  const phaseNames = ["Parents", "Offspring", "Predation"];
  return (
    <>
      {many && (
        <details className="model-note" open={latest === 0 && !first.pending}>
          <summary>
            A new experiment: lots of genes, small contributions
          </summary>
          <p>
            Imagine moths whose shade depends on lots of genes. Each offspring
            still inherits copies from both parents. These are fictional moths
            with existing variation — no new gene versions appear.
          </p>
        </details>
      )}
      <section className="card population-card">
        <div className="population-controls">
          <div className="phase-label">
            <span className="eyebrow">
              {view !== null
                ? replaying
                  ? "Replaying recorded history"
                  : "Inspecting history"
                : comparing
                  ? "Same starting moths · different woodland"
                  : phaseNames[first.phase]}
            </span>
            <h2>
              {view !== null
                ? `Generation ${first.run.history[view].number}`
                : many
                  ? "Give small changes time."
                  : "Who becomes a parent?"}
            </h2>
          </div>
          <div className="toolbar">
            <button
              className="primary"
              disabled={capped && !playing && !replaying}
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (!replaying) live();
                  setPlaying(true);
                }
              }}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              disabled={capped}
              onClick={() => {
                setPlaying(false);
                live();
                update(experiments.map(advance));
              }}
            >
              <SkipForward size={18} />
              {first.pending ? "Finish generation" : "Next generation"}
            </button>
            {!comparing && (
              <button
                disabled={capped}
                onClick={() => {
                  setPlaying(false);
                  live();
                  update(experiments.map(step));
                }}
              >
                <StepForward size={18} />
                {first.phase ? "Continue step" : "Step by step"}
              </button>
            )}
          </div>
        </div>
        <div className="experiment-options">
          <label>
            Playback{" "}
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
            >
              {["Slow", "Medium", "Fast"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {!many && (
            <button aria-pressed={inside} onClick={() => setInside(!inside)}>
              <Eye size={16} />
              Look inside
            </button>
          )}
          {onCompare && (
            <button
              onClick={() => {
                setPlaying(false);
                live();
                onCompare();
              }}
            >
              <GitBranch size={17} />
              {comparing ? "Return to single woodland" : "Compare woodlands"}
            </button>
          )}
          {many && (
            <button
              aria-pressed={compareStart}
              onClick={() => {
                setPlaying(false);
                setView(null);
                setCompareStart(!compareStart);
                setSelection(null);
              }}
            >
              Compare start and now
            </button>
          )}
          {view !== null && (
            <button className="accent" onClick={live}>
              Back to latest
            </button>
          )}
        </div>
        {capped && (
          <p className="notice" role="status">
            200 generations recorded. Explore the history, or start another
            experiment.
          </p>
        )}
        {many && first.run.history[1]?.number > 1 && (
          <p className="caption">
            The simulation keeps running. The graph and family inspector retain
            the starting moths and the latest 256 generations.
          </p>
        )}
        {view !== null && (
          <p className="caption">
            Looking back does not change the experiment. Playback and bark
            controls return to the latest generation.
          </p>
        )}
        <div className={`woodlands ${comparing || compareStart ? "two" : ""}`}>
          {compareStart && (
            <div>
              <h3>At the start</h3>
              <WoodlandCanvas
                experiment={first}
                view={0}
                inside={false}
                onSelect={(id) => inspect(id)}
              />
            </div>
          )}
          {experiments.map((exp, side) => (
            <div key={side}>
              <div className="bark-controls">
                {many ? (
                  <Slider
                    label="Bark shade"
                    value={exp.bark}
                    onChange={(value) => bark(value, side)}
                    left="Dark"
                    right="Light"
                  />
                ) : (
                  <div
                    className="segmented"
                    aria-label={`Woodland ${side + 1} bark`}
                  >
                    {[1, 0].map((value) => (
                      <button
                        key={value}
                        aria-pressed={exp.bark === value}
                        onClick={() => bark(value, side)}
                      >
                        {value ? "Light" : "Dark"} bark
                      </button>
                    ))}
                  </div>
                )}
                {exp.pending && exp.pending.bark !== exp.bark && (
                  <span className="caption">
                    New bark queued for the next generation
                  </span>
                )}
              </div>
              <WoodlandCanvas
                experiment={exp}
                view={
                  view !== null
                    ? Math.min(view, exp.run.history.length - 1)
                    : null
                }
                motion={motion}
                tempo={tempo}
                inside={inside}
                onSelect={(id) => inspect(id, side)}
              />
            </div>
          ))}
        </div>
        {first.pending && !comparing && (
          <div className="teaching-family">
            <span className="eyebrow">
              One of 24 families ·{" "}
              {first.pending.offspring[0].parents?.join(" + ")}
            </span>
            <div>
              {first.pending.offspring.slice(0, 4).map((moth) => (
                <button key={moth.id} onClick={() => inspect(moth.id)}>
                  <Silhouette shade={moth.shade} seed={moth.cosmetic} />
                  {!many && <Genes genes={moth.genes} origin={false} />}
                  <small>
                    {first.phase === 2
                      ? first.pending!.survivors.includes(moth.id)
                        ? "Survived"
                        : "Eaten"
                      : "Offspring"}
                  </small>
                </button>
              ))}
            </div>
            <p className="caption">
              {first.phase === 1
                ? "Each offspring inherited one copy per gene from each parent."
                : "Camouflage helps, but chance matters too. Only survivors become the next parents."}
            </p>
          </div>
        )}
      </section>
      {selected && inspectionRun && (
        <>
          <div className="ancestry-breadcrumb">
            <button
              onClick={() => {
                if (trail.length > 1) {
                  const next = trail.slice(0, -1);
                  setTrail(next);
                  setSelection({ side: selection!.side, id: next.at(-1)! });
                }
              }}
              disabled={trail.length < 2}
            >
              <ArrowLeft size={16} />
              Back along family
            </button>
            <span>{trail.join(" → ")}</span>
          </div>
          <Family
            run={inspectionRun}
            moth={selected}
            motion={motion}
            survivalKnown={
              !(
                selection &&
                experiments[selection.side].pending?.number ===
                  selected.generation &&
                experiments[selection.side].phase < 2
              )
            }
            onSelect={(id) => {
              setSelection({ side: selection!.side, id });
              setTrail([...trail, id]);
            }}
            onClose={() => setSelection(null)}
          />
        </>
      )}
      <div className={`history-row ${comparing ? "two" : ""}`}>
        {experiments.map((exp, i) => (
          <section className="card" key={i}>
            <History
              run={exp.run}
              selected={Math.min(view ?? latest, exp.run.history.length - 1)}
              onSelect={(generation) => {
                setPlaying(false);
                setSelection(null);
                setCompareStart(false);
                setView(generation);
              }}
            />
          </section>
        ))}
      </div>
      <div className="population-footer">
        <Thought>
          {many
            ? "Look at neighbours in time, then distant generations. Did any moth decide what its offspring should look like?"
            : "Survivors pass copies to their offspring. Over generations, that changes which appearances are common."}
        </Thought>
        <div className="toolbar">
          <button onClick={() => restart(false)}>
            <RotateCcw size={16} />
            Replay
          </button>
          <button onClick={() => restart(true)}>
            Repeat with fresh chance
          </button>
        </div>
      </div>
    </>
  );
}
