/** Verifies inheritance probabilities, selection, ancestry and mutation-free long runs. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  appearance,
  inherit,
  random,
  createRun,
  createExperiment,
  repeatExperiment,
  nextGeneration,
  living,
  mean,
  finish,
  step,
  advance,
  findMoth,
  LIMIT,
} from "../src/model.ts";
import {
  initialSession,
  validSession,
  birth,
  settle,
  goToChapter,
} from "../src/session.ts";

/** Runs a bounded experiment to examine ensemble trends and history integrity. */
function runFor(model, seed, bark, generations) {
  let experiment = createExperiment(model, seed, bark);
  for (let i = 0; i < generations; i++) experiment = advance(experiment);
  return experiment.run;
}

test("repeated experiments and comparisons retain exact founders after changing chance", () => {
  const original = createExperiment("single", 77);
  const repeated = repeatExperiment(advance(original), 78);
  const light = repeatExperiment(repeated, repeated.run.seed, 1);
  const dark = repeatExperiment(repeated, repeated.run.seed, 0);
  assert.deepEqual(light.run.history, original.run.history);
  assert.deepEqual(dark.run.history, original.run.history);
  assert.equal(light.run.seed, 78);
  assert.equal(dark.bark, 0);
  assert.equal(light.pending, null);
});

test("all parental pairs transmit only their own copies with correct independent probabilities", () => {
  const pairs = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ];
  for (const mum of pairs)
    for (const dad of pairs) {
      const draw = random(103);
      let light = 0;
      for (let i = 0; i < 12000; i++) {
        const genes = inherit(mum, dad, draw);
        assert.ok(mum.includes(genes[0]));
        assert.ok(dad.includes(genes[1]));
        light += appearance(genes, "single");
      }
      const expected = (((mum[0] + mum[1]) / 2) * (dad[0] + dad[1])) / 2;
      assert.ok(Math.abs(light / 12000 - expected) < 0.025);
    }
  assert.equal(appearance([0, 1], "single"), appearance([1, 0], "single"));
});

test("broods are independent draws rather than enforced one-in-four quotas", () => {
  let state = initialSession().brood;
  for (let i = 0; i < 20; i++) state = birth(state, true);
  const counts = state.broods.map(
    (brood) => brood.filter((genes) => appearance(genes, "single")).length,
  );
  assert.ok(counts.includes(0));
  assert.ok(counts.some((count) => count > 1));
  assert.equal(state.broods.flat().length, 80);
  assert.deepEqual(birth(state, true), state);
  let one = initialSession().brood;
  for (let i = 0; i < 80; i++) one = birth(one);
  assert.deepEqual(one, state);
});

test("founders have documented counts and both versions at each many-gene locus", () => {
  const single = living(createRun("single").history[0]);
  assert.equal(single.filter((moth) => moth.shade === 1).length, 12);
  assert.equal(
    single.reduce((n, moth) => n + moth.genes.filter(Boolean).length, 0),
    48,
  );
  const many = living(createRun("many").history[0]);
  assert.ok(many.every((moth) => moth.shade >= 0.4 && moth.shade <= 0.6));
  for (let i = 0; i < 64; i += 2) {
    const versions = new Set(
      many.flatMap((moth) => moth.genes.slice(i, i + 2)),
    );
    assert.deepEqual([...versions].sort(), [0, 1]);
  }
});

test("every offspring has two distinct live parents and inherits per locus without mutation", () => {
  const run = runFor("many", 718, 0.8, 30);
  for (let generation = 1; generation < run.history.length; generation++) {
    const current = run.history[generation];
    const prior = new Map(
      living(run.history[generation - 1]).map((moth) => [moth.id, moth]),
    );
    assert.equal(current.offspring.length, 96);
    assert.equal(new Set(current.survivors).size, 48);
    for (const moth of current.offspring) {
      assert.notEqual(...moth.parents);
      const [mum, dad] = moth.parents.map((id) => prior.get(id));
      assert.ok(mum && dad);
      for (let i = 0; i < 64; i += 2) {
        assert.ok(mum.genes.slice(i, i + 2).includes(moth.genes[i]));
        assert.ok(dad.genes.slice(i, i + 2).includes(moth.genes[i + 1]));
      }
      assert.equal(findMoth(run, moth.id), moth);
    }
  }
});

test("fixed versions and shades never reappear or change after a bark reversal", () => {
  for (const model of ["single", "many"]) {
    const experiment = createExperiment(model);
    const founders = experiment.run.history[0].offspring;
    for (const moth of founders) {
      moth.genes.fill(0);
      moth.shade = 0;
    }
    let current = experiment;
    for (let i = 0; i < 40; i++)
      current = advance({ ...current, bark: i < 20 ? 0 : 1 });
    assert.ok(
      current.run.history.every((gen) =>
        gen.offspring.every(
          (moth) => moth.shade === 0 && moth.genes.every((copy) => copy === 0),
        ),
      ),
    );
  }
});

test("light woodland favours light moths across 100 fixed seeds, with chance exceptions", () => {
  let lightTotal = 0;
  let darkTotal = 0;
  let mismatchesSurvived = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const light = runFor("single", seed, 1, 15);
    const dark = runFor("single", seed, 0, 15);
    lightTotal += mean(light.history.at(-1));
    darkTotal += mean(dark.history.at(-1));
    mismatchesSurvived += living(light.history[1]).filter(
      (moth) => moth.shade === 0,
    ).length;
  }
  assert.ok(lightTotal / 100 > 0.85);
  assert.ok(darkTotal / 100 < 0.08);
  assert.ok(mismatchesSurvived > 0);
});

test("many-gene populations shift visibly within 40 generations across 100 seeds", () => {
  let shift = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const run = runFor("many", seed, 0.8, 40);
    shift += mean(run.history.at(-1)) - mean(run.history[0]);
  }
  assert.ok(shift / 100 > 0.14, `Average shift was ${shift / 100}`);
});

test("stepwise, skipped and restored playback give identical biology", () => {
  let stepped = createExperiment("many", 712);
  let fast = createExperiment("many", 712);
  for (let generation = 0; generation < 20; generation++) {
    const bark = generation < 10 ? 0.8 : 0.2;
    stepped = { ...stepped, bark };
    for (let phase = 0; phase < 4; phase++)
      stepped = step(structuredClone(stepped));
    fast = advance({ ...fast, bark });
    assert.deepEqual(stepped, fast);
  }
  const pending = step(fast);
  assert.deepEqual(advance(pending), finish(pending));
  assert.equal(finish(pending).run.history.length, fast.run.history.length + 1);
});

test("queued background changes never rewrite the current computed generation", () => {
  const pending = step(createExperiment("single", 715, 1));
  const changed = { ...pending, bark: 0 };
  const finished = advance(changed);
  assert.equal(finished.run.history.at(-1).bark, 1);
  const next = advance(finished);
  assert.equal(next.run.history.at(-1).bark, 0);
  assert.deepEqual(next.run.history.at(-2), pending.pending);
});

test("a 200-generation history remains bounded, replayable and inspectable", () => {
  const run = runFor("many", 51, 0.8, 200);
  assert.equal(run.history.length, LIMIT + 1);
  assert.ok(findMoth(run, "g200-95"));
  assert.throws(() => nextGeneration(run, 0.8), /200/);
  const exp = { run, bark: 0.8, phase: 0, pending: null };
  assert.equal(advance(exp), exp);
  const session = { ...initialSession(), deep: exp };
  assert.ok(validSession(session));
});

test("saved sessions reject corrupt versions, missing ancestry and invalid gene copies", () => {
  const session = initialSession();
  session.deep = advance(session.deep);
  assert.ok(validSession(structuredClone(session)));
  assert.ok(!validSession(null));
  assert.ok(!validSession({ ...session, version: 999 }));
  const badCopy = structuredClone(session);
  badCopy.deep.run.history[1].offspring[0].genes[0] = 2;
  assert.ok(!validSession(badCopy));
  const badParent = structuredClone(session);
  badParent.deep.run.history[1].offspring[0].parents[0] = "g0-9000";
  assert.ok(!validSession(badParent));
  const badSurvivors = structuredClone(session);
  badSurvivors.deep.run.history[1].survivors.fill("g1-0");
  assert.ok(!validSession(badSurvivors));
});

test("chapter navigation settles pending events but never runs an extra generation", () => {
  const session = initialSession();
  session.deep = step(session.deep);
  session.woodland.single = step(session.woodland.single);
  const settled = settle(session);
  assert.equal(settled.deep.run.history.length, 2);
  assert.equal(settled.woodland.single.run.history.length, 2);
  assert.deepEqual(settle(settled), settled);
  assert.ok(validSession(settled));
});

test("direct chapter entry cannot later change the parents of saved offspring", () => {
  let session = goToChapter(initialSession(), 3, false);
  session.brood = birth(session.brood, true);
  const originalBrood = structuredClone(session.brood);
  session = goToChapter(session, 2);
  session.builder.parents = [
    [1, 1],
    [1, 1],
  ];
  session = goToChapter(session, 3);
  assert.deepEqual(session.brood, originalBrood);
  const firstVisit = { ...initialSession(), chapter: 2 };
  firstVisit.builder.parents = [
    [1, 1],
    [1, 1],
  ];
  assert.deepEqual(goToChapter(firstVisit, 3).brood.parents, [
    [1, 1],
    [1, 1],
  ]);
});

test("leaving a conception commits its already selected copies exactly once", () => {
  const session = initialSession();
  session.brood.stage = 2;
  const expected = birth(session.brood);
  const next = goToChapter(session, 4);
  assert.deepEqual(next.brood, expected);
  assert.deepEqual(goToChapter(next, 5).brood, expected);
});
