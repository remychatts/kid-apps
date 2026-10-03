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
  search: {
    bark: number;
    daylight: number;
    seed: number;
    found: number[];
    reveal: boolean;
  };
  builder: {
    genes: number[][];
    visible: boolean;
    prediction: boolean;
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
    search: { bark: 1, daylight: 1, seed: 42, found: [], reveal: false },
    builder: {
      genes: [
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      visible: false,
      prediction: false,
      parents: [
        [0, 1],
        [0, 1],
      ],
    },
    brood: {
      stage: 0,
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
    brood: session.brood.stage ? birth(session.brood) : session.brood,
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
  if (chapter === 3)
    next.brood = {
      ...next.brood,
      visited: true,
      parents:
        carryParents &&
        session.chapter === 2 &&
        !next.brood.visited &&
        next.brood.broods.length === 0
          ? session.builder.parents.map((genes) => [...genes])
          : next.brood.parents,
    };
  return { ...next, chapter };
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
      typeof s.motion !== "boolean"
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
      typeof s.builder.visible !== "boolean" ||
      typeof s.builder.prediction !== "boolean"
    )
      return false;
    if (
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
        exp.phase > 3 ||
        Boolean(exp.pending) !== exp.phase > 0
      )
        return false;
      const run = exp.run;
      if (
        !["single", "many"].includes(run.model) ||
        !Number.isInteger(run.seed) ||
        run.history.length < 1 ||
        run.history.length > 201
      )
        return false;
      const genesLength = run.model === "single" ? 2 : 64;
      const generations = [
        ...run.history,
        ...(exp.pending ? [exp.pending] : []),
      ];
      for (const [index, gen] of generations.entries()) {
        if (
          gen.number !== index ||
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
        const prior = index ? new Set(generations[index - 1].survivors) : null;
        for (const [i, moth] of gen.offspring.entries()) {
          if (
            moth.id !== `g${index}-${i}` ||
            moth.generation !== index ||
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
            prior &&
            (!moth.parents ||
              moth.parents.length !== 2 ||
              moth.parents[0] === moth.parents[1] ||
              !moth.parents.every((id) => prior.has(id)))
          )
            return false;
          if (!prior && moth.parents !== null) return false;
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
