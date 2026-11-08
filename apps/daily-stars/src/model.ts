/** Daily goal history and deterministic, bottom-up mosaic rewards. */
export const STORAGE_KEY = "daily-stars-v1";
export const palette = [
  "#ffb547",
  "#b794f6",
  "#ff7ca8",
  "#56cfa7",
  "#70b5ff",
  "#ff9270",
  "#f582cf",
  "#5bd2dc",
  "#b2d866",
];
export type Goal = {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  omitted: boolean;
};
export type Entry = { goal: string; day: string; id: string };
export type State = {
  version: 1;
  name: string;
  goals: Goal[];
  entries: Entry[];
  sound: boolean;
  celebrated: number;
};
export const defaults = [
  ["Read something", "📚"],
  ["Make something", "🎨"],
  ["Help someone", "🤝"],
  ["Go outside", "🌿"],
  ["Try something hard", "🚀"],
  ["Laugh often", "😄"],
  ["Love each other", "💖"],
  ["Talk and listen", "💬"],
  ["Move", "⚡"],
];
/** Creates a single child's initial collection. */
export function initialState(name: string): State {
  return {
    version: 1,
    name: name.trim(),
    goals: defaults.map(([name, emoji], i) => ({
      id: `starter-${i}`,
      name,
      emoji,
      colour: palette[i],
      omitted: false,
    })),
    entries: [],
    sound: true,
    celebrated: 0,
  };
}
/** Uses device-local calendar dates, including across daylight-saving boundaries. */
export function dayKey(offset = 0, now = new Date()): string {
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offset,
  );
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
/** Toggles at most one completion per goal per calendar day without sorting history. */
export function toggleGoal(state: State, goal: string, day: string): State {
  const exists = state.entries.some((e) => e.goal === goal && e.day === day);
  return {
    ...state,
    entries: exists
      ? state.entries.filter((e) => e.goal !== goal || e.day !== day)
      : [...state.entries, { goal, day, id: crypto.randomUUID() }],
  };
}
// Hand-drawn silhouettes: dots are empty; squares fill from the lowest row upwards.
export const shapes = [
  {
    name: "Superstar",
    emoji: "⭐",
    rows: [
      "......#......",
      ".....###.....",
      ".....###.....",
      "....#####....",
      "#############",
      ".###########.",
      "..#########..",
      "...#######...",
      "..####.####..",
      "..###...###..",
      ".###.....###.",
    ],
  },
  {
    name: "Big heart",
    emoji: "💖",
    rows: [
      ".###...###.",
      "#####.#####",
      "###########",
      "###########",
      ".#########.",
      "..#######..",
      "...#####...",
      "....###....",
      ".....#.....",
    ],
  },
  {
    name: "Butterfly",
    emoji: "🦋",
    rows: [
      "##.......##",
      "###..#..###",
      "####.#.####",
      "###########",
      ".#########.",
      "..#######..",
      ".#########.",
      "#####.#####",
      ".###...###.",
      "..#.....#..",
    ],
  },
  {
    name: "Moon rocket",
    emoji: "🚀",
    rows: [
      "....#....",
      "...###...",
      "..#####..",
      "..#####..",
      "..##.##..",
      "..#...#..",
      "..##.##..",
      "..#####..",
      ".#######.",
      "#########",
      "###...###",
      "##.#.#.##",
      "...###...",
      "....#....",
    ],
  },
  {
    name: "Cosmic cat",
    emoji: "🐱",
    rows: [
      "##.......##",
      "###.....###",
      "####...####",
      "###########",
      "###########",
      "##.#####.##",
      "###########",
      ".####.####.",
      "..#######..",
      "...#####...",
    ],
  },
  {
    name: "Shining gem",
    emoji: "💎",
    rows: [
      "..#######..",
      ".#########.",
      "###########",
      "###########",
      ".#########.",
      "..#######..",
      "...#####...",
      "....###....",
      ".....#.....",
    ],
  },
];
/** Produces the stable fill order for a silhouette. */
export function cells(index: number) {
  const rows = shapes[index % shapes.length].rows;
  return rows
    .flatMap((row, y) =>
      [...row].flatMap((cell, x) => (cell === "#" ? [{ x, y }] : [])),
    )
    .sort((a, b) => b.y - a.y || a.x - b.x);
}
/** Banks complete shapes and carries any extra squares straight into the next. */
export function rewards(entries: Entry[]) {
  const medals: { shape: number; entries: Entry[] }[] = [];
  let used = 0;
  while (entries.length - used >= cells(medals.length).length) {
    const size = cells(medals.length).length;
    medals.push({
      shape: medals.length % shapes.length,
      entries: entries.slice(used, used + size),
    });
    used += size;
  }
  return {
    medals,
    shape: medals.length % shapes.length,
    current: entries.slice(used),
  };
}
/** Validates local and server data before allowing it to replace a child's history. */
export function parseState(value: unknown): State {
  const s = value as State;
  if (
    !s ||
    s.version !== 1 ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    !Array.isArray(s.goals) ||
    !Array.isArray(s.entries) ||
    typeof s.sound !== "boolean" ||
    !Number.isInteger(s.celebrated) ||
    s.celebrated < 0
  )
    throw new Error("This is not a valid Daily Stars backup.");
  const ids = new Set<string>();
  for (const g of s.goals) {
    if (
      !g ||
      typeof g.id !== "string" ||
      ids.has(g.id) ||
      typeof g.name !== "string" ||
      !g.name.trim() ||
      typeof g.emoji !== "string" ||
      !/^#[a-f0-9]{6}$/i.test(g.colour) ||
      typeof g.omitted !== "boolean"
    )
      throw new Error("The backup contains an invalid goal.");
    ids.add(g.id);
  }
  const pairs = new Set<string>();
  for (const e of s.entries) {
    const pair = `${e?.day}:${e?.goal}`;
    if (
      !e ||
      !ids.has(e.goal) ||
      typeof e.id !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.day) ||
      Number.isNaN(Date.parse(e.day)) ||
      new Date(`${e.day}T12:00:00Z`).toISOString().slice(0, 10) !== e.day ||
      pairs.has(pair)
    )
      throw new Error("The backup contains invalid daily history.");
    pairs.add(pair);
  }
  return s;
}
