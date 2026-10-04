/** Deterministic inheritance, weighted survival and immutable population histories. */
export type Model = "single" | "many";
export type Individual = {
  id: string;
  parents: [string, string] | null;
  generation: number;
  genes: number[];
  shade: number;
  cosmetic: number;
};
export type Generation = {
  number: number;
  bark: number;
  offspring: Individual[];
  survivors: string[];
};
export type Run = { model: Model; seed: number; history: Generation[] };
export type Experiment = {
  run: Run;
  bark: number;
  phase: number;
  pending: Generation | null;
};
export const LIMIT = 200;
export const HISTORY_WINDOW = 256;
export const MANY_LOCI = 8;

/** Mixes a seed and stream number without consuming another stream's draws. */
export function mix(seed: number, stream: number): number {
  let x = (seed ^ Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

/** Returns reproducible independent draws strictly between zero and one. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296 + 0.5 / 4294967296;
  };
}

/** Shuffles a copy using unbiased Fisher–Yates swaps. */
export function shuffled<T>(values: T[], draw: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Derives appearance solely from the inherited copies (one means Light). */
export function appearance(genes: number[], model: Model): number {
  return model === "single"
    ? Number(genes.every((copy) => copy === 1))
    : genes.reduce((sum, copy) => sum + copy, 0) / genes.length;
}

/** Creates a record whose cosmetic identity is independent of biological draws. */
export function individual(
  genes: number[],
  model: Model,
  generation: number,
  index: number,
  seed: number,
  parents: [string, string] | null = null,
): Individual {
  return {
    id: `g${generation}-${index}`,
    parents,
    generation,
    genes: [...genes],
    shade: appearance(genes, model),
    cosmetic: mix(seed, generation * 100 + index),
  };
}

/** Independently samples one copy per parent at each locus, without mutation. */
export function inherit(
  mum: number[],
  dad: number[],
  draw: () => number,
): number[] {
  const genes: number[] = [];
  for (let locus = 0; locus < mum.length; locus += 2) {
    genes.push(
      mum[locus + Number(draw() >= 0.5)],
      dad[locus + Number(draw() >= 0.5)],
    );
  }
  return genes;
}

/** Constructs a documented population; diversity is guaranteed here only. */
export function createRun(model: Model, seed = 2417): Run {
  const draw = random(mix(seed, 0));
  const founders = Array.from({ length: 48 }, (_, i) => {
    let genes: number[];
    if (model === "single") genes = i < 12 ? [1, 1] : i < 36 ? [0, 1] : [0, 0];
    else if (i < 2)
      genes = Array.from({ length: MANY_LOCI * 2 }, (_, j) => (i + j) % 2);
    else {
      // Fewer equal contributions widen segregation spread without inventing new gene copies.
      const lights = 7 + Math.floor(draw() * 3);
      genes = shuffled(
        Array.from({ length: MANY_LOCI * 2 }, (_, j) => Number(j < lights)),
        draw,
      );
    }
    return individual(genes, model, 0, i, seed);
  });
  return {
    model,
    seed,
    history: [
      {
        number: 0,
        bark: model === "single" ? 1 : 0.8,
        offspring: founders,
        survivors: founders.map((moth) => moth.id),
      },
    ],
  };
}

/** Reads living members from an immutable generation. */
export function living(generation: Generation): Individual[] {
  const survivors = new Set(generation.survivors);
  return generation.offspring.filter((moth) => survivors.has(moth.id));
}

/** Selects by exponential-race keys; every moth retains a positive chance. */
export function select(
  offspring: Individual[],
  bark: number,
  draw: () => number,
  model: Model = "many",
): string[] {
  // A search-image teaching heuristic makes birds focus on the common appearance.
  const lightFrequency =
    offspring.filter((moth) => moth.shade === 1).length / offspring.length;
  return offspring
    .map((moth) => ({
      id: moth.id,
      key:
        -Math.log(draw()) /
        ((0.2 + 0.8 * (1 - Math.abs(moth.shade - bark)) ** 2) /
          (model === "single"
            ? (0.1 + (moth.shade ? lightFrequency : 1 - lightFrequency)) ** 2
            : 1)),
    }))
    .sort((a, b) => a.key - b.key || a.id.localeCompare(b.id))
    .slice(0, 48)
    .map((entry) => entry.id);
}

/** Computes one generation with separate pairing, inheritance and survival streams. */
export function nextGeneration(run: Run, bark: number): Generation {
  const number = run.history.at(-1)!.number + 1;
  if (run.model === "single" && number > LIMIT)
    throw new Error("This experiment has reached 200 generations.");
  const parents = shuffled(
    living(run.history.at(-1)!),
    random(mix(run.seed, number * 3)),
  );
  const draw = random(mix(run.seed, number * 3 + 1));
  const offspring: Individual[] = [];
  for (let pair = 0; pair < parents.length; pair += 2) {
    const mum = parents[pair];
    const dad = parents[pair + 1];
    for (let sibling = 0; sibling < 4; sibling++) {
      offspring.push(
        individual(
          inherit(mum.genes, dad.genes, draw),
          run.model,
          number,
          offspring.length,
          run.seed,
          [mum.id, dad.id],
        ),
      );
    }
  }
  return {
    number,
    bark,
    offspring,
    survivors: select(
      offspring,
      bark,
      random(mix(run.seed, number * 3 + 2)),
      run.model,
    ),
  };
}

/** Sets up a paused experiment with its own environment and history. */
export function createExperiment(
  model: Model,
  seed = 2417,
  bark = model === "single" ? 1 : 0.8,
): Experiment {
  return { run: createRun(model, seed), bark, phase: 0, pending: null };
}

/** Starts another experiment from the exact recorded founders, including their cosmetic identity. */
export function repeatExperiment(
  experiment: Experiment,
  seed = experiment.run.seed,
  bark = experiment.bark,
): Experiment {
  return {
    bark,
    phase: 0,
    pending: null,
    run: { ...experiment.run, seed, history: [experiment.run.history[0]] },
  };
}

/** Commits only an already computed event, e.g. when leaving a chapter. */
export function finish(experiment: Experiment): Experiment {
  if (!experiment.pending) return experiment;
  return {
    ...experiment,
    phase: 0,
    pending: null,
    run: {
      ...experiment.run,
      history:
        experiment.run.model === "many" &&
        experiment.run.history.length >= HISTORY_WINDOW + 1
          ? [
              experiment.run.history[0],
              ...experiment.run.history.slice(-(HISTORY_WINDOW - 1)),
              experiment.pending,
            ]
          : [...experiment.run.history, experiment.pending],
    },
  };
}

/** Advances a teaching phase, computing biology only at the first phase. */
export function step(experiment: Experiment): Experiment {
  if (experiment.pending) {
    return experiment.phase === 2
      ? finish(experiment)
      : { ...experiment, phase: experiment.phase + 1 };
  }
  if (
    experiment.run.model === "single" &&
    experiment.run.history.length > LIMIT
  )
    return experiment;
  return {
    ...experiment,
    phase: 1,
    pending: nextGeneration(experiment.run, experiment.bark),
  };
}

/** Completes the current cycle or exactly one new cycle at any playback speed. */
export function advance(experiment: Experiment): Experiment {
  return finish(experiment.pending ? experiment : step(experiment));
}

/** Locates either a survivor or a non-surviving sibling for honest ancestry inspection. */
export function findMoth(run: Run, id: string): Individual | undefined {
  const generation = Number(id.split("-")[0].slice(1));
  return run.history
    .find((entry) => entry.number === generation)
    ?.offspring.find((moth) => moth.id === id);
}

/** Summarises the distribution of living shades in nine stable bins. */
export function distribution(generation: Generation): number[] {
  const bins = Array<number>(9).fill(0);
  for (const moth of living(generation))
    bins[Math.min(8, Math.floor(moth.shade * 9))]++;
  return bins;
}

/** Computes the living population's mean shade, never substituting it for its spread. */
export function mean(generation: Generation): number {
  return (
    living(generation).reduce((sum, moth) => sum + moth.shade, 0) /
    generation.survivors.length
  );
}
