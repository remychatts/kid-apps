/** Touch-friendly specimen studio for comparing forms and exploring cosmetic anatomy. */
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { Moth } from "./Moth";
import {
  createSpecimen,
  featureRanges,
  type Features,
  type Specimen,
} from "./specimen";
import "./style.css";

const names = ["Pip", "Clover", "Pebble", "Fig"];
const initialSeeds = [42, 107, 256, 831];

/** Creates a fresh seed only in response to a user action, never during rendering. */
function freshSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** Downloads reproducible component props for the currently selected specimen. */
function saveSpecimen(specimen: Specimen, name: string) {
  const blob = new Blob(
    [JSON.stringify({ ...specimen, animated: true }, null, 2) + "\n"],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.toLowerCase()}-moth.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Presents four independent specimens, keeping cosmetic controls separate from form. */
export function App() {
  const [specimens, setSpecimens] = useState(() =>
    initialSeeds.map((seed, i) =>
      createSpecimen(seed, i % 2 ? "carbonaria" : "typica"),
    ),
  );
  const [selected, setSelected] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [background, setBackground] = useState<"paper" | "bark">("paper");
  const [notice, setNotice] = useState("");
  const current = specimens[selected];

  /** Updates only the selected moth; neighbouring specimens retain their identities. */
  function updateSelected(patch: Partial<Specimen>) {
    setSpecimens((previous) =>
      previous.map((specimen, index) =>
        index === selected ? { ...specimen, ...patch } : specimen,
      ),
    );
    setNotice("");
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href="../" aria-label="Kid Apps catalogue">
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          <span>
            little wonders
            <span className="brand-caption">A CLOSER LOOK AT NATURE</span>
          </span>
        </a>
        <span className="edition">
          <span /> THE MOTH COLLECTION
        </span>
        <a className="catalogue-link" href="../">
          All apps <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">SMALL CREATURES. BIG PERSONALITIES.</p>
            <h1>
              Moth studio<span>.</span>
            </h1>
            <p className="subtitle">
              A little pepper. A lot of personality. Meet your moths.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setSpecimens((previous) =>
                previous.map((specimen) =>
                  createSpecimen(freshSeed(), specimen.form),
                ),
              );
              setNotice(
                "Four fresh faces, with the same light and dark forms.",
              );
            }}
          >
            <Shuffle size={18} /> Meet a new bunch
          </button>
        </section>
        <div className="workspace">
          <section
            className={`collection ${background}`}
            aria-label="Your moth collection"
          >
            <div className="collection-toolbar">
              <span>
                <span className="live-dot" /> FOUR LITTLE INDIVIDUALS
              </span>
              <div className="background-switch" aria-label="Backdrop">
                <button
                  aria-pressed={background === "paper"}
                  onClick={() => setBackground("paper")}
                >
                  Paper
                </button>
                <button
                  aria-pressed={background === "bark"}
                  onClick={() => setBackground("bark")}
                >
                  Bark
                </button>
              </div>
            </div>
            <div className="specimen-grid">
              {specimens.map((specimen, index) => (
                <button
                  key={index}
                  className={`specimen-card ${selected === index ? "selected" : ""}`}
                  aria-pressed={selected === index}
                  aria-label={`Select ${names[index]}, ${specimen.form === "typica" ? "light typica" : "dark carbonaria"} moth`}
                  onClick={() => {
                    setSelected(index);
                    setNotice("");
                  }}
                >
                  <span className="specimen-number">0{index + 1}</span>
                  <span className="selection-mark">
                    {selected === index && <Check size={15} />}
                  </span>
                  <Moth
                    {...specimen}
                    animated={animated}
                    label={`${names[index]}, a ${specimen.form} peppered moth`}
                  />
                  <span className="specimen-caption">
                    <strong>{names[index]}</strong>
                    <span className={`form-tag ${specimen.form}`}>
                      <i />
                      {specimen.form === "typica"
                        ? "Light · typica"
                        : "Dark · carbonaria"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="collection-footer">
              <span>Pick a moth. Get to know its little quirks.</span>
              <button
                className="motion-button"
                aria-pressed={animated}
                onClick={() => setAnimated((value) => !value)}
              >
                {animated ? <Pause size={15} /> : <Play size={15} />}
                {animated ? "Pause motion" : "Play motion"}
              </button>
            </div>
          </section>
          <aside className="editor" aria-label="Selected moth controls">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">HELLO THERE,</p>
                <h2>
                  Meet {names[selected]}
                  <span>!</span>
                </h2>
              </div>
              <span className="tiny-spark">
                <Sparkles size={24} />
              </span>
            </div>
            <section className="form-control">
              <div className="section-label">
                <h3>Colour form</h3>
                <span className="gene-label">THE GENETIC BIT</span>
              </div>
              <div className="form-switch">
                {(["typica", "carbonaria"] as const).map((form) => (
                  <button
                    key={form}
                    className={current.form === form ? "active" : ""}
                    aria-pressed={current.form === form}
                    onClick={() => updateSelected({ form })}
                  >
                    <span className={`colour-swatch ${form}`} />
                    <span>
                      <strong>{form === "typica" ? "Light" : "Dark"}</strong>
                      <em>{form}</em>
                    </span>
                    {current.form === form && <Check size={16} />}
                  </button>
                ))}
              </div>
              <p className="helper">Same species. Two different looks.</p>
            </section>
            <section className="features-control">
              <div className="section-label">
                <h3>A little character</h3>
                <span className="cosmetic-label">JUST FOR FUN</span>
              </div>
              {Object.entries(featureRanges).map(([key, range]) => (
                <label className="feature" key={key}>
                  <span>
                    {range.label}
                    <output>
                      {Math.round(
                        current.features[key as keyof Features] * 100,
                      )}
                      %
                    </output>
                  </span>
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step="0.01"
                    value={current.features[key as keyof Features]}
                    onChange={(event) =>
                      updateSelected({
                        features: {
                          ...current.features,
                          [key]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
              <button
                className="shuffle-button"
                onClick={() =>
                  updateSelected(createSpecimen(freshSeed(), current.form))
                }
              >
                <Shuffle size={16} /> Shuffle {names[selected]}’s look
              </button>
              <div className="editor-actions">
                <button
                  onClick={() =>
                    updateSelected(
                      createSpecimen(initialSeeds[selected], current.form),
                    )
                  }
                >
                  <RotateCcw size={14} /> Reset look
                </button>
                <button
                  onClick={() => {
                    saveSpecimen(current, names[selected]);
                    setNotice(`${names[selected]}’s settings downloaded.`);
                  }}
                >
                  <ArrowDownToLine size={14} /> Save settings
                </button>
              </div>
            </section>
          </aside>
        </div>
        <footer className="field-note">
          <span className="note-icon">
            <Leaf size={20} />
          </span>
          <p>
            <strong>One species, wonderfully different.</strong> These are
            peppered moths. Their light or dark form is the genetics part; their
            big eyes, smiles and little quirks are just for fun.
          </p>
          <span className="scientific-name">Biston betularia</span>
        </footer>
        <p className="status" role="status">
          {notice}
        </p>
      </main>
    </div>
  );
}
