/** Versioned lesson state, deterministic brood experiments and safe saved-session validation. */
import {
  createExperiment,
  finish,
  inherit,
  random,
  mix,
  type Experiment,
} from "./model.ts";
export type BroodState = {
  stage: number;
  demonstration: number;
  demonstrated: number[][];
  parents: number[][];
  broods: number[][][];
  seed: number;
  manual: boolean;
  chosen: number[];
  revealed: boolean;
  visited: boolean;
};
export type Session = {
  version: 1;
  chapter: number;
  motion: boolean;
  muted: boolean;
  speeds: [string, string];
  search: {
    bark: number;
    daylight: number;
    seed: number;
    found: number[];
    reveal: boolean;
  };
  builder: {
    genes: number[][];
    revealed: boolean[];
    dirty: boolean;
    parents: number[][];
  };
  brood: BroodState;
  woodland: {
    single: Experiment;
    comparison: Experiment[] | null;
    comparing: boolean;
  };
  deep: Experiment;
};

/** Creates independent chapter defaults so direct navigation never needs prerequisites. */
export function initialSession(): Session {
  return {
    version: 1,
    chapter: 1,
    motion: true,
    muted: false,
    speeds: ["Slow", "Slow"],
    search: { bark: 1, daylight: 1, seed: 42, found: [], reveal: false },
    builder: {
      genes: [
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      revealed: [false, false, false],
      dirty: false,
      parents: [
        [0, 1],
        [0, 1],
      ],
    },
    brood: {
      stage: 0,
      demonstration: 0,
      demonstrated: [],
      parents: [
        [0, 1],
        [0, 1],
      ],
      broods: [],
      seed: 123,
      manual: false,
      chosen: [0, 0],
      revealed: false,
      visited: false,
    },
    woodland: {
      single: createExperiment("single"),
      comparison: null,
      comparing: false,
    },
    deep: createExperiment("many"),
  };
}

/** Completes precomputed cycles on navigation without running any additional generation. */
export function settle(session: Session): Session {
  return {
    ...session,
    brood: session.brood.stage ? demonstrate(session.brood) : session.brood,
    deep: finish(session.deep),
    woodland: {
      ...session.woodland,
      single: finish(session.woodland.single),
      comparison: session.woodland.comparison?.map(finish) ?? null,
    },
  };
}

/** Changes chapters without ever reassigning parents to an existing brood. */
export function goToChapter(
  session: Session,
  chapter: number,
  carryParents = true,
): Session {
  const next = settle(session);
  if (chapter === 3) {
    if (carryParents && session.builder.dirty) {
      if (
        session.builder.parents.some(
          (genes, i) => genes.join() !== next.brood.parents[i].join(),
        )
      )
        next.brood = {
          ...initialSession().brood,
          parents: session.builder.parents.map((genes) => [...genes]),
          visited: true,
        };
      next.builder = { ...next.builder, dirty: false };
    } else next.brood = { ...next.brood, visited: true };
  }
  return { ...next, chapter };
}

/** Walks the four ordered copy choices without altering the independent chance tally. */
export function demonstrate(state: BroodState): BroodState {
  const choice = state.demonstration % 4;
  const genes = [
    state.parents[0][Math.floor(choice / 2)],
    state.parents[1][choice % 2],
  ];
  return {
    ...state,
    stage: 0,
    demonstration: state.demonstration + 1,
    demonstrated: [...state.demonstrated.slice(-3), genes],
  };
}

/** Adds independent births, preserving the current partial brood and the 20-brood cap. */
export function birth(state: BroodState, finishBrood = false): BroodState {
  const broods = state.broods.map((brood) => [...brood]);
  if (!broods.length || broods.at(-1)!.length === 4) {
    if (broods.length >= 20) return state;
    broods.push([]);
  }
  const brood = broods.at(-1)!;
  const count = finishBrood ? 4 - brood.length : 1;
  for (let i = 0; i < count; i++) {
    const index = (broods.length - 1) * 4 + brood.length;
    brood.push(
      inherit(
        state.parents[0],
        state.parents[1],
        random(mix(state.seed, index)),
      ),
    );
  }
  return { ...state, broods, stage: 0, manual: false };
}

/** Upgrades the first release's controls while retaining its recorded biological outcomes. */
export function upgradeSession(value: unknown): unknown {
  try {
    if (!value || typeof value !== "object") return value;
    const saved = value as Session;
    if (
      saved.version !== 1 ||
      !saved.builder ||
      !saved.brood ||
      !saved.woodland ||
      !saved.deep
    )
      return value;
    if (saved.builder.revealed !== undefined) return value;
    const defaults = initialSession();
    /** Maps the former growth phase into the combined offspring animation. */
    const upgradeExperiment = (exp: Experiment): Experiment => ({
      ...exp,
      phase: exp.phase === 3 ? 2 : exp.phase === 2 ? 1 : exp.phase,
    });
    return {
      ...saved,
      muted: false,
      speeds: defaults.speeds,
      builder: {
        ...saved.builder,
        revealed: [false, false, false],
        dirty: false,
      },
      brood: {
        ...(saved.brood.stage ? birth(saved.brood) : saved.brood),
        stage: 0,
        demonstration: 0,
        demonstrated: [],
      },
      deep: upgradeExperiment(saved.deep),
      woodland: {
        ...saved.woodland,
        single: upgradeExperiment(saved.woodland.single),
        comparison: saved.woodland.comparison?.map(upgradeExperiment) ?? null,
      },
    };
  } catch {
    return value;
  }
}

/** Checks persisted structure and ancestry contracts before it can reach the UI. */
export function validSession(value: unknown): value is Session {
  try {
    const s = value as Session;
    if (
      !s ||
      s.version !== 1 ||
      !Number.isInteger(s.chapter) ||
      s.chapter < 1 ||
      s.chapter > 5 ||
      typeof s.motion !== "boolean" ||
      typeof s.muted !== "boolean" ||
      s.speeds.length !== 2 ||
      !s.speeds.every((v) => ["Slow", "Medium", "Fast"].includes(v))
    )
      return false;
    const bitPair = (pair: number[]) =>
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every((n) => n === 0 || n === 1);
    const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
    if (
      !unit(s.search.daylight) ||
      ![0, 1].includes(s.search.bark) ||
      !Number.isInteger(s.search.seed) ||
      !Array.isArray(s.search.found) ||
      !s.search.found.every((n) => Number.isInteger(n) && n >= 0 && n < 8) ||
      typeof s.search.reveal !== "boolean"
    )
      return false;
    if (
      !s.builder.genes.every(bitPair) ||
      s.builder.genes.length !== 3 ||
      s.builder.parents.length !== 2 ||
      !s.builder.parents.every(bitPair) ||
      s.builder.revealed.length !== 3 ||
      !s.builder.revealed.every((v) => typeof v === "boolean") ||
      typeof s.builder.dirty !== "boolean"
    )
      return false;
    if (
      !Number.isInteger(s.brood.demonstration) ||
      s.brood.demonstration < 0 ||
      s.brood.demonstrated.length > 4 ||
      !s.brood.demonstrated.every(bitPair) ||
      !Number.isInteger(s.brood.stage) ||
      s.brood.stage < 0 ||
      s.brood.stage > 3 ||
      s.brood.parents.length !== 2 ||
      !s.brood.parents.every(bitPair) ||
      !Number.isInteger(s.brood.seed) ||
      s.brood.broods.length > 20 ||
      !s.brood.broods.every(
        (b) => Array.isArray(b) && b.length <= 4 && b.every(bitPair),
      ) ||
      !bitPair(s.brood.chosen) ||
      typeof s.brood.manual !== "boolean" ||
      typeof s.brood.revealed !== "boolean" ||
      typeof s.brood.visited !== "boolean"
    )
      return false;
    for (const exp of [
      s.woodland.single,
      ...(s.woodland.comparison ?? []),
      s.deep,
    ]) {
      if (
        !exp ||
        !unit(exp.bark) ||
        !Number.isInteger(exp.phase) ||
        exp.phase < 0 ||
        exp.phase > 2 ||
        Boolean(exp.pending) !== exp.phase > 0
      )
        return false;
      const run = exp.run;
      if (
        !["single", "many"].includes(run.model) ||
        !Number.isInteger(run.seed) ||
        run.history.length < 1 ||
        run.history.length > 257
      )
        return false;
      const genesLength = run.model === "single" ? 2 : 64;
      const generations = [
        ...run.history,
        ...(exp.pending ? [exp.pending] : []),
      ];
      for (const [index, gen] of generations.entries()) {
        if (
          !Number.isInteger(gen.number) ||
          gen.number < 0 ||
          (index === 0
            ? gen.number !== 0
            : index === 1 && run.model === "many"
              ? gen.number < 1
              : gen.number !== generations[index - 1].number + 1) ||
          !unit(gen.bark) ||
          gen.offspring.length !== (index === 0 ? 48 : 96) ||
          gen.survivors.length !== 48 ||
          new Set(gen.survivors).size !== 48
        )
          return false;
        const ids = new Set(gen.offspring.map((m) => m.id));
        if (
          ids.size !== gen.offspring.length ||
          !gen.survivors.every((id) => ids.has(id))
        )
          return false;
        const prior =
          index && generations[index - 1].number === gen.number - 1
            ? new Set(generations[index - 1].survivors)
            : null;
        for (const [i, moth] of gen.offspring.entries()) {
          if (
            moth.id !== `g${gen.number}-${i}` ||
            moth.generation !== gen.number ||
            !Number.isInteger(moth.cosmetic) ||
            moth.genes.length !== genesLength ||
            !moth.genes.every((n) => n === 0 || n === 1)
          )
            return false;
          const shade =
            run.model === "single"
              ? Number(moth.genes.every((n) => n === 1))
              : moth.genes.reduce<number>((sum, n) => sum + n, 0) / 64;
          if (moth.shade !== shade) return false;
          if (
            index > 0 &&
            (!moth.parents ||
              moth.parents.length !== 2 ||
              moth.parents[0] === moth.parents[1] ||
              !moth.parents.every((id) =>
                new RegExp(`^g${gen.number - 1}-[0-9]+$`).test(id),
              ))
          )
            return false;
          if (
            prior &&
            (!moth.parents ||
              moth.parents.length !== 2 ||
              moth.parents[0] === moth.parents[1] ||
              !moth.parents.every((id) => prior.has(id)))
          )
            return false;
          if (index === 0 && moth.parents !== null) return false;
        }
      }
    }
    return (
      s.deep.run.model === "many" &&
      s.woodland.single.run.model === "single" &&
      typeof s.woodland.comparing === "boolean" &&
      (!s.woodland.comparing || s.woodland.comparison?.length === 2) &&
      (s.woodland.comparison === null ||
        (s.woodland.comparison.length === 2 &&
          s.woodland.comparison.every((exp) => exp.run.model === "single")))
    );
  } catch {
    return false;
  }
}
