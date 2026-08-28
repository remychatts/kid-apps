/** Holds deterministic level data and pure helpers for Penguin Peak. */
export type ObstacleKind = "ice" | "rock";

export type Obstacle = {
  x: number;
  width: number;
  height: number;
  kind: ObstacleKind;
};

export type Level = {
  name: string;
  distance: number;
  speed: number;
  sky: [string, string];
  obstacles: Obstacle[];
};

/** Creates one compact obstacle record for a level definition. */
const obstacle = (
  x: number,
  kind: ObstacleKind,
  width = kind === "rock" ? 52 : 46,
  height = kind === "rock" ? 46 : 54,
): Obstacle => ({ x, kind, width, height });

export const LEVELS: Level[] = [
  {
    name: "Snowflake Slope",
    distance: 3600,
    speed: 310,
    sky: ["#43d9ff", "#5d70e8"],
    obstacles: [
      obstacle(720, "ice"),
      obstacle(1250, "ice"),
      obstacle(1810, "rock"),
      obstacle(2390, "ice", 52, 62),
      obstacle(2970, "rock"),
    ],
  },
  {
    name: "Aurora Rush",
    distance: 4300,
    speed: 350,
    sky: ["#263b91", "#14b8a6"],
    obstacles: [
      obstacle(650, "ice"),
      obstacle(1160, "rock"),
      obstacle(1690, "ice", 64, 58),
      obstacle(2210, "ice"),
      obstacle(2730, "rock", 58, 51),
      obstacle(3300, "ice"),
      obstacle(3780, "rock"),
    ],
  },
  {
    name: "Midnight Mountain",
    distance: 5000,
    speed: 390,
    sky: ["#07182d", "#5034a8"],
    obstacles: [
      obstacle(610, "rock"),
      obstacle(1080, "ice", 60, 60),
      obstacle(1550, "rock"),
      obstacle(1980, "ice"),
      obstacle(2440, "rock", 62, 50),
      obstacle(2930, "ice", 58, 66),
      obstacle(3430, "rock"),
      obstacle(3940, "ice"),
      obstacle(4440, "rock"),
    ],
  },
];

/** Returns whether two axis-aligned rectangles overlap with forgiving edges. */
export function collides(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const padding = 8;
  return (
    a.x + padding < b.x + b.width - padding &&
    a.x + a.width - padding > b.x + padding &&
    a.y + padding < b.y + b.height - padding &&
    a.y + a.height - padding > b.y + padding
  );
}
