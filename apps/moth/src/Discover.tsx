/** Camouflage search and gene-copy construction canvases, with no biological mutation. */
import { Eye, EyeOff, RefreshCw, Sun } from "lucide-react";
import type { Session } from "./session";
import { random, appearance } from "./model";
import { Bark, Silhouette, Slider, Thought, Specimen, Genes } from "./ui";

type SearchState = Session["search"];
type BuilderState = Session["builder"];

/** Lets the observer vary illumination while moth identity and position remain fixed. */
export function Discover({
  state,
  update,
}: {
  state: SearchState;
  update: (state: SearchState) => void;
}) {
  const draw = random(state.seed);
  const positions = Array.from({ length: 8 }, (_, i) => ({
    x: 12 + (i % 4) * 25 + draw() * 5 - 2.5,
    y: 27 + Math.floor(i / 4) * 42 + draw() * 12 - 6,
  }));
  const light = state.daylight;
  /** Marks discovery without changing the specimen or running predation. */
  function find(index: number) {
    if (!state.found.includes(index))
      update({ ...state, found: [...state.found, index] });
  }
  return (
    <div className="discover-grid">
      <section className="card search-card">
        <div className="card-heading">
          <span className="eyebrow">A closer look at the woodland</span>
          <span className="pill" aria-live="polite">
            Found {state.found.length} of 8
          </span>
        </div>
        <div
          className="search-scene"
          role="group"
          aria-label="Eight moths resting on bark"
        >
          <div
            className="lit-scene"
            style={{
              filter: `brightness(${0.55 + light * 0.45}) contrast(${0.12 + light * 0.88}) saturate(${0.3 + light * 0.7})`,
            }}
          >
            <Bark shade={state.bark} />
            {positions.map((position, i) => (
              <div
                key={i}
                className="hidden-moth"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <Silhouette shade={i % 2} seed={state.seed + i} />
              </div>
            ))}
            <div className="twilight" style={{ opacity: (1 - light) * 0.22 }} />
          </div>
          {positions.map((position, i) => (
            <button
              key={i}
              className={`find-target ${state.found.includes(i) || state.reveal ? "found" : ""}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => find(i)}
              aria-label={`${i % 2 ? "Light" : "Dark"} moth ${i + 1}${state.found.includes(i) ? ", found" : ""}`}
            >
              {(state.found.includes(i) || state.reveal) && (
                <span className="found-label">
                  {i + 1}
                  {state.found.includes(i) ? " ✓" : ""}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <button
            className="primary"
            onClick={() => update({ ...state, reveal: !state.reveal })}
          >
            {state.reveal ? <EyeOff size={18} /> : <Eye size={18} />}
            {state.reveal ? "Hide outlines" : "Reveal moths"}
          </button>
          <button onClick={() => update({ ...state, found: [] })}>
            Clear markers
          </button>
          <button
            onClick={() =>
              update({
                ...state,
                seed: state.seed + 1,
                found: [],
                reveal: false,
              })
            }
          >
            <RefreshCw size={16} />
            New hiding places
          </button>
        </div>
      </section>
      <aside className="card control-card">
        <span className="eyebrow">Change the setting</span>
        <h2>
          Same moths.
          <br />
          Different view.
        </h2>
        <p>Tap the moths you can spot. Some are hiding better than others.</p>
        <fieldset>
          <legend>Bark</legend>
          <div className="segmented">
            {[1, 0].map((bark) => (
              <button
                key={bark}
                aria-pressed={state.bark === bark}
                onClick={() => update({ ...state, bark })}
              >
                {bark ? "Light" : "Dark"} bark
              </button>
            ))}
          </div>
        </fieldset>
        <div className="daylight-control">
          <Sun size={21} />
          <Slider
            label="Daylight"
            value={light}
            onChange={(daylight) => update({ ...state, daylight })}
            left="Dim · dawn / dusk"
            right="Bright · daytime"
          />
        </div>
        <Thought>
          Does a moth have to match perfectly to be harder to see?
        </Thought>
        <p className="caption">
          Changing light can make a resting moth harder to spot. Camouflage can
          help without being a perfect match.
        </p>
        <details>
          <summary>Explore without searching</summary>
          <ul className="specimen-list">
            {positions.map((_, i) => (
              <li key={i}>
                <button onClick={() => find(i)}>
                  Moth {i + 1} · {i % 2 ? "Light" : "Dark"}
                  {state.found.includes(i) ? " · Found" : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </aside>
    </div>
  );
}

/** Makes hidden copies tangible while marking all edits as new specimen construction. */
export function Instructions({
  state,
  update,
  motion,
}: {
  state: BuilderState;
  update: (state: BuilderState) => void;
  motion: boolean;
}) {
  /** Replaces the built preview when a copy is edited. */
  function change(card: number, copy: number) {
    const genes = state.genes.map((pair, i) =>
      i === card
        ? pair.map((value, j) => (j === copy ? 1 - value : value))
        : pair,
    );
    update({
      ...state,
      genes,
      revealed: state.revealed.map((value, i) => (i === card ? false : value)),
    });
  }
  return (
    <>
      <div className="intro-strip">
        <p>
          One colour gene. <strong>Two copies.</strong> One from each parent.
        </p>
      </div>
      <div className="moth-cards">
        {state.genes.map((genes, i) => (
          <section className="card build-card" key={i}>
            <div className="card-heading">
              <span className="eyebrow">Build a moth · {i + 1}</span>
              <span className="pill">
                {!state.revealed[i]
                  ? "What will it look like?"
                  : appearance(genes, "single")
                    ? "Light appearance"
                    : "Dark appearance"}
              </span>
            </div>
            <button
              className="phenotype-reveal"
              aria-label={`Reveal moth ${i + 1} appearance`}
              onClick={() =>
                update({
                  ...state,
                  revealed: state.revealed.map((v, j) => (j === i ? true : v)),
                })
              }
            >
              <Specimen
                genes={genes}
                seed={42 + i * 13}
                motion={motion}
                hidden={!state.revealed[i]}
              />
            </button>
            <Genes
              genes={genes}
              onChange={(copy) => change(i, copy)}
              prefix={`Moth ${i + 1}`}
            />
            <p className="caption">
              Predict its wings, then tap the question mark. Tap a copy to build
              a new moth.
            </p>
            <button
              className="text-button"
              onClick={() =>
                update({
                  ...state,
                  genes: state.genes.map((pair, j) =>
                    i === j ? [...pair].reverse() : pair,
                  ),
                  revealed: state.revealed.map((v, j) => (i === j ? false : v)),
                })
              }
            >
              Swap copy order
            </button>
            <div className="parent-actions">
              {["Mum", "Dad"].map((name, parent) => (
                <button
                  key={name}
                  aria-pressed={state.parents[parent].join() === genes.join()}
                  onClick={() =>
                    update({
                      ...state,
                      parents: state.parents.map((pair, j) =>
                        j === parent ? [...genes] : pair,
                      ),
                    })
                  }
                >
                  Use for {name}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="builder-bottom">
        <Thought>
          One dark version is enough for dark wings. Light wings need two light
          versions.
        </Thought>
        <div className="parent-preview">
          <span>Your next parents</span>
          {state.parents.map((genes, i) => (
            <div key={i}>
              <small>{i ? "Dad" : "Mum"}</small>
              <Genes genes={genes} origin={false} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
