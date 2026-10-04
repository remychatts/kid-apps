/** Manual possible offspring and independent chance broods, with visible parental contributions. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dice5, ArrowDown, Sparkles } from "lucide-react";
import { birth, demonstrate, type BroodState } from "./session";
import { appearance } from "./model";
import { Genes, Specimen, Thought } from "./ui";

const lifeNames = ["Egg", "Caterpillar", "Pupa", "Moth"];

/** Illustrates the growing offspring; its adult appearance uses the same transmitted copies. */
function LifeStage({
  stage,
  genes,
  motion,
}: {
  stage: number;
  genes: number[];
  motion: boolean;
}) {
  if (stage === 3) return <Specimen genes={genes} motion={motion} />;
  return (
    <svg viewBox="0 0 260 150" role="img" aria-label={lifeNames[stage]}>
      {stage === 0 ? (
        <ellipse
          cx="130"
          cy="78"
          rx="32"
          ry="43"
          fill="#fff8df"
          stroke="#958456"
          strokeWidth="3"
        />
      ) : stage === 1 ? (
        <>
          <g fill="#9abc61" stroke="#526b39" strokeWidth="3">
            {[60, 87, 114, 141].map((x) => (
              <circle key={x} cx={x} cy="95" r="22" />
            ))}
            <circle cx="171" cy="77" r="34" />
          </g>
          <path
            d="M55 114v8m28-8v8m28-8v8m28-8v8"
            stroke="#526b39"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g fill="#fffdf2" stroke="#526b39" strokeWidth="2">
            <ellipse cx="158" cy="69" rx="12" ry="16" />
            <ellipse cx="185" cy="69" rx="12" ry="16" />
          </g>
          <g fill="#24332b">
            <ellipse cx="160" cy="71" rx="6" ry="9" />
            <ellipse cx="183" cy="71" rx="6" ry="9" />
          </g>
          <g fill="white">
            <circle cx="157" cy="66" r="3" />
            <circle cx="180" cy="66" r="3" />
          </g>
          <path
            d="M159 92q13 16 26 0"
            fill="none"
            stroke="#24332b"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path d="M130 18v15" stroke="#526b39" strokeWidth="4" />
          <path
            d="M130 30q-38 12-27 66q7 33 27 42q20-9 27-42q11-54-27-66Z"
            fill="#b3a66c"
            stroke="#73663f"
            strokeWidth="3"
          />
          <path
            d="M104 64q26 14 52 0m-51 23q25 14 50 0m-44 23q19 12 38 0"
            fill="none"
            stroke="#73663f"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}

/** Presents parents, gametes and siblings without treating copies as a finite inventory. */
export function Offspring({
  state,
  update,
  motion,
  confirm,
}: {
  state: BroodState;
  update: (state: BroodState) => void;
  motion: boolean;
  confirm: (message: string, action: () => void) => void;
}) {
  const stage = state.stage;
  const brood = state.broods.at(-1) ?? [];
  const all = state.broods.flat();
  const lights = all.filter(
    (genes) => appearance(genes, "single") === 1,
  ).length;
  const manualGenes = state.parents.map((genes, i) => genes[state.chosen[i]]);
  const lab = useRef<HTMLElement>(null);
  const layout = useRef<HTMLDivElement>(null);
  const flightOrigin = useRef<DOMRect | null>(null);
  const [lifeStage, setLifeStage] = useState(0);
  const [transferring, setTransferring] = useState(false);
  const choice = state.demonstration % 4;
  const selectedCopies = [Math.floor(choice / 2), choice % 2];
  useEffect(() => {
    if (stage !== 3) {
      setLifeStage(0);
      return;
    }
    if (lifeStage === 3) return;
    // Give each illustration time to be read, including when decorative motion is disabled.
    const timer = window.setTimeout(
      () => setLifeStage((current) => current + 1),
      1400,
    );
    return () => window.clearTimeout(timer);
  }, [stage, lifeStage]);
  useEffect(() => {
    if (!motion || stage < 1 || stage > 2) return;
    // Finish the visible copy journey before the next birth step can replace its destination.
    setTransferring(true);
    const timer = window.setTimeout(() => setTransferring(false), 850);
    return () => {
      window.clearTimeout(timer);
      setTransferring(false);
    };
  }, [stage, motion]);
  useLayoutEffect(() => {
    const from = flightOrigin.current;
    flightOrigin.current = null;
    const target = layout.current?.querySelector(
      ".guided-examples .baby:last-child .moth",
    );
    if (!motion || !from || !target) return;
    const to = target.getBoundingClientRect();
    const animation = target.animate(
      [
        {
          transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px, ${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${from.width / to.width})`,
        },
        { transform: "translate(0, 0) scale(1)" },
      ],
      { duration: 1200, easing: "cubic-bezier(.25,.8,.25,1)" },
    );
    return () => animation.cancel();
  }, [state.demonstration, motion]);
  useLayoutEffect(() => {
    if (!motion || !stage || stage > 2 || state.manual || !lab.current) return;
    const animations: Animation[] = [];
    for (const parent of [stage - 1]) {
      const source = lab.current
        .querySelectorAll(".parent")
        [parent]?.querySelectorAll(".gene")[selectedCopies[parent]];
      const target = lab.current.querySelector(
        parent ? ".gamete.sperm .gene" : ".gamete.egg .gene",
      );
      if (!source || !target) continue;
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      animations.push(
        target.animate(
          [
            {
              transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px, ${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${from.width / to.width})`,
            },
            { transform: "translate(0, 0) scale(1)" },
          ],
          { duration: 850, easing: "cubic-bezier(.25,.8,.25,1)" },
        ),
      );
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [stage, motion, state.manual, choice]);
  const pendingGenes = state.parents.map(
    (genes, i) => genes[selectedCopies[i]],
  );
  /** Starts a new family experiment; historical offspring are never edited. */
  function editParent(parent: number, copy: number) {
    const action = () => {
      update({
        ...state,
        parents: state.parents.map((pair, i) =>
          i === parent
            ? pair.map((value, j) => (j === copy ? 1 - value : value))
            : pair,
        ),
        broods: [],
        stage: 0,
        revealed: false,
        demonstration: 0,
        demonstrated: [],
      });
    };
    if (all.length || stage)
      confirm(
        "Changing the parents starts a new family and clears these broods. Continue?",
        action,
      );
    else action();
  }
  /** Advances the guided birth and records its completed copy combination. */
  function nextBirth() {
    if (stage < 3) update({ ...state, stage: stage + 1 });
    else {
      flightOrigin.current =
        lab.current
          ?.querySelector(".life-cycle .moth")
          ?.getBoundingClientRect() ?? null;
      update(demonstrate(state));
    }
  }
  return (
    <div ref={layout} className="offspring-layout">
      <section ref={lab} className="card family-lab">
        <div className="card-heading">
          <span className="eyebrow">The parents keep both their copies</span>
          <span className="pill">One from each</span>
        </div>
        <div className="parents">
          {state.parents.map((genes, i) => (
            <div
              className={`parent ${stage === i + 1 ? "highlight" : ""}`}
              key={i}
            >
              <h2>{i ? "Dad" : "Mum"}</h2>
              <Specimen genes={genes} seed={73 + i * 28} motion={motion} />
              <Genes
                genes={genes}
                onChange={(copy) => editParent(i, copy)}
                prefix={i ? "Dad" : "Mum"}
                origin={false}
                selected={
                  stage > i && !state.manual ? selectedCopies[i] : undefined
                }
              />
              <small>Tap a copy to start a different family</small>
            </div>
          ))}
        </div>
        <div className="inheritance-path">
          <div>
            <ArrowDown />
            <span>one copy in an egg</span>
          </div>
          <div className="join-sign">+</div>
          <div>
            <ArrowDown />
            <span>one copy in a sperm</span>
          </div>
        </div>
        {!state.manual && stage > 0 && (
          <div className={`gamete-transfer stage-${stage}`} aria-live="polite">
            <div className="gamete egg">
              <span className={`gene ${pendingGenes[0] ? "light" : "dark"}`}>
                {pendingGenes[0] ? "L" : "D"}
              </span>
              <small>
                Mum's egg · {pendingGenes[0] ? "Light" : "Dark"} copy
              </small>
            </div>
            {stage > 1 && (
              <div className="gamete sperm">
                <span className={`gene ${pendingGenes[1] ? "light" : "dark"}`}>
                  {pendingGenes[1] ? "L" : "D"}
                </span>
                <small>
                  Dad's sperm · {pendingGenes[1] ? "Light" : "Dark"} copy
                </small>
              </div>
            )}
            {stage > 2 && (
              <div className="life-cycle">
                <div className="life-picture" key={lifeStage}>
                  <LifeStage
                    stage={lifeStage}
                    genes={pendingGenes}
                    motion={motion}
                  />
                </div>
                <strong>
                  {lifeNames[lifeStage]}
                  {lifeStage === 3
                    ? ` · ${appearance(pendingGenes, "single") ? "Light" : "Dark"} appearance`
                    : ""}
                </strong>
              </div>
            )}
          </div>
        )}
        {state.manual ? (
          <div className="manual-lab">
            <h3>Try a combination</h3>
            <p>Choose one copy from each parent.</p>
            <div className="gamete-choices">
              {state.parents.map((genes, parent) => (
                <fieldset key={parent}>
                  <legend>{parent ? "Dad's sperm" : "Mum's egg"}</legend>
                  <div className="segmented">
                    {genes.map((copy, i) => (
                      <button
                        key={i}
                        aria-pressed={state.chosen[parent] === i}
                        onClick={() =>
                          update({
                            ...state,
                            chosen: state.chosen.map((value, j) =>
                              parent === j ? i : value,
                            ),
                            revealed: false,
                          })
                        }
                      >
                        Copy {i + 1} · {copy ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="possible-child">
              <Genes genes={manualGenes} />
              <button
                className="primary"
                onClick={() => update({ ...state, revealed: true })}
              >
                Show possible offspring
              </button>
              {state.revealed && (
                <div className="possible-moth">
                  <Specimen genes={manualGenes} motion={motion} />
                  <span>
                    {appearance(manualGenes, "single") ? "Light" : "Dark"}{" "}
                    appearance
                  </span>
                </div>
              )}
            </div>
            <p className="caption">
              A possible offspring you assembled. This does not enter the chance
              tally.
            </p>
          </div>
        ) : (
          <div className="conception">
            <div
              className="life-stages"
              aria-label="Egg, caterpillar, pupa, moth"
            >
              {lifeNames.map((name, i) => (
                <span
                  className={stage === 3 && i === lifeStage ? "active" : ""}
                  key={name}
                >
                  {name}
                </span>
              ))}
            </div>
            <p aria-live="polite">
              {
                [
                  "Let’s walk through the four possible copy combinations, one at a time.",
                  "Mum contributes one copy in an egg. Her own two copies stay with her.",
                  "Dad contributes one copy in a sperm. The two copies come together.",
                  "Later… the offspring grows through caterpillar and pupa stages into a moth.",
                ][stage]
              }
            </p>
            <div className="toolbar">
              <button
                onClick={nextBirth}
                disabled={transferring || (stage === 3 && lifeStage < 3)}
              >
                {stage ? "Continue birth" : "Make one, step by step"}
              </button>
              <button
                className="primary"
                disabled={all.length >= 80}
                onClick={() => {
                  update(birth(stage ? demonstrate(state) : state, true));
                }}
              >
                <Dice5 size={18} />
                {brood.length === 4 || !brood.length
                  ? "Make a brood"
                  : "Finish brood"}
              </button>
            </div>
          </div>
        )}
      </section>
      <aside className="card brood-panel">
        <span className="eyebrow">Explore inheritance</span>
        <h2>
          What might <br />
          their babies be?
        </h2>
        <div className="segmented">
          <button
            aria-pressed={!state.manual}
            onClick={() => {
              update({ ...state, stage: 0, manual: false });
            }}
          >
            <Dice5 size={17} />
            Guided steps
          </button>
          <button
            aria-pressed={state.manual}
            onClick={() => {
              update({
                ...(stage ? demonstrate(state) : state),
                manual: true,
                stage: 0,
              });
            }}
          >
            Try a combination
          </button>
        </div>
        <div className="guided-examples">
          <h3>Guided combinations · {choice + 1} of 4 next</h3>
          <p className="caption">
            These examples cycle in order. Only random broods enter the tally
            below.
          </p>
          <div className="brood-grid">
            {state.demonstrated.map((genes, i) => (
              <div className="baby" key={i}>
                <Genes genes={genes} origin={false} />
                <Specimen genes={genes} motion={motion} />
                <small>{appearance(genes, "single") ? "Light" : "Dark"}</small>
              </div>
            ))}
          </div>
        </div>
        <h3>
          {state.broods.length
            ? `Brood ${state.broods.length}`
            : "Your first brood"}
        </h3>
        <div className="brood-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="baby" key={i}>
              {brood[i] ? (
                <>
                  <Specimen
                    genes={brood[i]}
                    seed={state.broods.length * 11 + i}
                    motion={motion}
                  />
                  <Genes genes={brood[i]} origin={false} />
                  <small>
                    {appearance(brood[i], "single") ? "Light" : "Dark"}
                  </small>
                </>
              ) : (
                <div className="empty-baby">
                  <Sparkles size={24} />
                  <small>Offspring {i + 1}</small>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="tally" aria-live="polite">
          <div>
            <strong>{lights}</strong>
            <span>light</span>
          </div>
          <div>
            <strong>{all.length - lights}</strong>
            <span>dark</span>
          </div>
          <div>
            <strong>{all.length}</strong>
            <span>in total</span>
          </div>
        </div>
        {all.length >= 80 && (
          <p>Twenty broods recorded. Start a fresh tally to explore again.</p>
        )}
        {all.length > 0 && (
          <button
            className="text-button"
            onClick={() =>
              confirm(
                "Clear the recorded broods and start a fresh chance tally with these parents?",
                () => {
                  update({
                    ...state,
                    broods: [],
                    stage: 0,
                    seed: state.seed + 1,
                  });
                },
              )
            }
          >
            Start fresh tally
          </button>
        )}
        <Thought>
          Two dark parents can have a light baby — if each passes on a light
          version.
        </Thought>
        <details>
          <summary>
            Earlier broods ({Math.max(0, state.broods.length - 1)})
          </summary>
          {state.broods.slice(0, -1).map((b, i) => (
            <p key={i}>
              Brood {i + 1}:{" "}
              {b
                .map((g) => (appearance(g, "single") ? "Light" : "Dark"))
                .join(" · ")}
            </p>
          ))}
        </details>
      </aside>
    </div>
  );
}
