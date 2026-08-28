/** Renders and controls the Penguin Peak canvas game. */
import { useCallback, useEffect, useRef, useState } from "react";
import { playSound, toggleMute } from "./audio";
import { collides, LEVELS, type Obstacle } from "./game";

type Phase = "intro" | "playing" | "dead" | "levelWon" | "complete";

type GameState = {
  phase: Phase;
  levelIndex: number;
  distance: number;
  penguinY: number;
  velocityY: number;
  elapsed: number;
  particles: Array<{ x: number; y: number; life: number }>;
  lastTime: number;
  crashKind: "ice" | "rock" | null;
};

const GROUND_Y = 0.78;
const PENGUIN_X = 0.22;

/** Draws a rounded rectangle without requiring newer canvas APIs. */
function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

/** Paints the illustrated game world for the current frame. */
function draw(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GameState,
): void {
  const level = LEVELS[state.levelIndex];
  const ground = height * GROUND_Y;
  const scale = Math.min(1.25, Math.max(0.7, height / 620));
  const penguinWidth = 66 * scale;
  const penguinHeight = 82 * scale;
  const px = width * PENGUIN_X;
  const py = ground - penguinHeight - state.penguinY;

  const sky = context.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, level.sky[0]);
  sky.addColorStop(1, level.sky[1]);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // Layered peaks and aurora give the scene depth while remaining inexpensive.
  context.globalAlpha = 0.17;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(0, ground * 0.82);
  for (let x = -80; x < width + 160; x += 190) {
    context.lineTo(x + 80, ground * 0.34);
    context.lineTo(x + 190, ground * 0.82);
  }
  context.lineTo(width, ground);
  context.lineTo(0, ground);
  context.fill();
  context.globalAlpha = 1;

  for (let index = 0; index < 30; index += 1) {
    const x =
      (index * 137 - state.distance * (0.06 + (index % 3) * 0.015)) %
      (width + 60);
    const y = 30 + ((index * 79) % Math.max(80, ground - 70));
    context.fillStyle = `rgba(255,255,255,${0.28 + (index % 4) * 0.13})`;
    context.beginPath();
    context.arc(
      x < -20 ? x + width + 60 : x,
      y,
      2 + (index % 3),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const ice = context.createLinearGradient(0, ground, 0, height);
  ice.addColorStop(0, "#edfdff");
  ice.addColorStop(0.28, "#b7efff");
  ice.addColorStop(1, "#5bc6ec");
  context.fillStyle = ice;
  context.beginPath();
  context.moveTo(0, ground - 8);
  context.quadraticCurveTo(width * 0.45, ground + 16, width, ground - 4);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.75)";
  context.lineWidth = 5;
  context.stroke();

  level.obstacles.forEach((item) =>
    drawObstacle(context, item, state.distance, px, ground, scale),
  );

  // The finish becomes a bright ocean opening at the very end of the hill.
  const finishX = px + (level.distance - state.distance) * scale;
  if (finishX < width + 200) {
    context.fillStyle = "#0576bb";
    context.beginPath();
    context.moveTo(finishX, ground - 3);
    context.lineTo(width + 20, ground - 3);
    context.lineTo(width + 20, height);
    context.lineTo(finishX - 80, height);
    context.closePath();
    context.fill();
    context.strokeStyle = "#7ff4ff";
    context.lineWidth = 7;
    context.beginPath();
    for (let x = finishX; x < width + 40; x += 28) {
      context.quadraticCurveTo(x + 7, ground - 11, x + 14, ground - 3);
      context.quadraticCurveTo(x + 21, ground + 5, x + 28, ground - 3);
    }
    context.stroke();
  }

  drawPenguin(context, px, py, penguinWidth, penguinHeight, state);

  context.fillStyle = "rgba(255,255,255,.8)";
  state.particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life);
    context.beginPath();
    context.arc(particle.x, particle.y, 3 + particle.life * 3, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

/** Draws a single ice-block or rock hazard in world space. */
function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: Obstacle,
  distance: number,
  penguinX: number,
  ground: number,
  scale: number,
): void {
  const x = penguinX + (obstacle.x - distance) * scale;
  if (x < -100 || x > context.canvas.width + 100) return;
  const width = obstacle.width * scale;
  const height = obstacle.height * scale;
  const y = ground - height;
  if (obstacle.kind === "ice") {
    const gradient = context.createLinearGradient(x, y, x + width, ground);
    gradient.addColorStop(0, "#f3feff");
    gradient.addColorStop(1, "#46c9ef");
    context.fillStyle = gradient;
    roundRect(context, x, y, width, height, 8);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.stroke();
    context.strokeStyle = "rgba(8,92,150,.35)";
    context.beginPath();
    context.moveTo(x + width * 0.25, y + 8);
    context.lineTo(x + width * 0.55, y + height * 0.48);
    context.lineTo(x + width * 0.43, ground - 6);
    context.stroke();
  } else {
    context.fillStyle = "#34435a";
    context.beginPath();
    context.moveTo(x, ground);
    context.lineTo(x + width * 0.13, y + height * 0.34);
    context.lineTo(x + width * 0.5, y);
    context.lineTo(x + width * 0.88, y + height * 0.24);
    context.lineTo(x + width, ground);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(255,255,255,.22)";
    context.beginPath();
    context.moveTo(x + width * 0.27, y + height * 0.3);
    context.lineTo(x + width * 0.5, y + 7);
    context.lineTo(x + width * 0.62, y + height * 0.4);
    context.closePath();
    context.fill();
  }
}

/** Draws the hero with a changing pose for sliding, jumping and crashing. */
function drawPenguin(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  state: GameState,
): void {
  context.save();
  context.translate(x + width / 2, y + height / 2);
  const angle =
    state.phase === "dead" ? 1.35 : state.penguinY > 8 ? -0.16 : 0.12;
  context.rotate(angle);
  context.translate(-width / 2, -height / 2);
  context.fillStyle = "#092b4c";
  context.beginPath();
  context.ellipse(
    width / 2,
    height * 0.56,
    width * 0.45,
    height * 0.51,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "#fff8df";
  context.beginPath();
  context.ellipse(
    width / 2,
    height * 0.62,
    width * 0.3,
    height * 0.36,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "#092b4c";
  context.beginPath();
  context.ellipse(
    width * 0.27,
    height * 0.21,
    width * 0.25,
    height * 0.25,
    -0.4,
    0,
    Math.PI * 2,
  );
  context.ellipse(
    width * 0.73,
    height * 0.21,
    width * 0.25,
    height * 0.25,
    0.4,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "white";
  context.beginPath();
  context.arc(width * 0.37, height * 0.2, width * 0.07, 0, Math.PI * 2);
  context.arc(width * 0.63, height * 0.2, width * 0.07, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#08243f";
  context.beginPath();
  context.arc(width * 0.38, height * 0.205, width * 0.032, 0, Math.PI * 2);
  context.arc(width * 0.64, height * 0.205, width * 0.032, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ff9b32";
  context.beginPath();
  context.moveTo(width * 0.38, height * 0.3);
  context.lineTo(width * 0.62, height * 0.3);
  context.lineTo(width * 0.5, height * 0.42);
  context.closePath();
  context.fill();
  context.restore();
}

/** Creates a clean run state for one level. */
const initialState = (levelIndex = 0): GameState => ({
  phase: "intro",
  levelIndex,
  distance: 0,
  penguinY: 0,
  velocityY: 0,
  elapsed: 0,
  particles: [],
  lastTime: 0,
  crashKind: null,
});

/** Hosts the animation loop and accessible controls around the canvas. */
export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initialState());
  const frameRef = useRef(0);
  const [view, setView] = useState({
    phase: "intro" as Phase,
    levelIndex: 0,
    progress: 0,
    elapsed: 0,
  });
  const [muted, setMuted] = useState(false);

  /** Copies the small amount of state used by accessible HTML controls. */
  const syncView = useCallback(() => {
    const state = stateRef.current;
    setView({
      phase: state.phase,
      levelIndex: state.levelIndex,
      progress: Math.min(1, state.distance / LEVELS[state.levelIndex].distance),
      elapsed: state.elapsed,
    });
  }, []);

  /** Starts or restarts the current level. */
  const start = useCallback(
    (levelIndex = stateRef.current.levelIndex) => {
      stateRef.current = { ...initialState(levelIndex), phase: "playing" };
      syncView();
    },
    [syncView],
  );

  /** Makes the penguin leap when the run is active. */
  const jump = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === "intro" || state.phase === "dead") {
      start(state.levelIndex);
      return;
    }
    if (state.phase === "levelWon") {
      start(state.levelIndex + 1);
      return;
    }
    if (state.phase === "complete") {
      start(0);
      return;
    }
    if (state.penguinY < 5) {
      state.velocityY = 640;
      playSound("jump");
    }
  }, [start]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    let lastViewSync = 0;

    /** Advances physics and draws one animation frame. */
    const frame = (time: number) => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const bounds = canvas.getBoundingClientRect();
      const pixelWidth = Math.round(bounds.width * ratio);
      const pixelHeight = Math.round(bounds.height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const state = stateRef.current;
      const dt = state.lastTime
        ? Math.min(0.035, (time - state.lastTime) / 1000)
        : 0;
      state.lastTime = time;
      const level = LEVELS[state.levelIndex];
      const width = bounds.width;
      const height = bounds.height;
      const scale = Math.min(1.25, Math.max(0.7, height / 620));

      if (state.phase === "playing") {
        state.distance += level.speed * dt;
        state.elapsed += dt;
        state.velocityY -= 1450 * dt;
        state.penguinY = Math.max(0, state.penguinY + state.velocityY * dt);
        if (state.penguinY === 0 && state.velocityY < 0) state.velocityY = 0;
        if (Math.random() < 0.42) {
          state.particles.push({
            x: width * PENGUIN_X,
            y: height * GROUND_Y - 10,
            life: 1,
          });
        }
        state.particles.forEach((particle) => {
          particle.x -= (level.speed * 0.35 + 30) * dt;
          particle.y -= 34 * dt;
          particle.life -= 1.6 * dt;
        });
        state.particles = state.particles.filter(
          (particle) => particle.life > 0,
        );

        const penguin = {
          x: width * PENGUIN_X,
          y: height * GROUND_Y - 82 * scale - state.penguinY,
          width: 66 * scale,
          height: 82 * scale,
        };
        const hit = level.obstacles.find((item) =>
          collides(penguin, {
            x: width * PENGUIN_X + (item.x - state.distance) * scale,
            y: height * GROUND_Y - item.height * scale,
            width: item.width * scale,
            height: item.height * scale,
          }),
        );
        if (hit) {
          state.phase = "dead";
          state.crashKind = hit.kind;
          playSound(hit.kind === "rock" ? "crash" : "bump");
          syncView();
        } else if (state.distance >= level.distance) {
          state.phase =
            state.levelIndex === LEVELS.length - 1 ? "complete" : "levelWon";
          state.penguinY = 80;
          playSound("splash");
          window.setTimeout(() => playSound("win"), 180);
          syncView();
        }
      }
      draw(context, width, height, state);
      if (time - lastViewSync > 120) {
        syncView();
        lastViewSync = time;
      }
      frameRef.current = requestAnimationFrame(frame);
    };
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, [syncView]);

  const level = LEVELS[view.levelIndex];
  const overlay = {
    intro: {
      eyebrow: "Ready, belly, GO!",
      title: "Penguin Peak!",
      text: "Tap anywhere to jump over every block and rock.",
      button: "Start sliding",
    },
    dead: {
      eyebrow: stateRef.current.crashKind === "rock" ? "CRASH!" : "BONK!",
      title:
        stateRef.current.crashKind === "rock" ? "Rock got you!" : "Ice tumble!",
      text:
        stateRef.current.crashKind === "rock"
          ? "That rock ended the run. Dust off the snow and try again."
          : "Jump over the ice blocks to keep your belly-slide going.",
      button: "Try again",
    },
    levelWon: {
      eyebrow: "SPLASH!",
      title: "Level complete!",
      text: `${level.name} conquered in ${view.elapsed.toFixed(1)} seconds.`,
      button: "Next slope",
    },
    complete: {
      eyebrow: "HOORAY!",
      title: "Ocean champion!",
      text: "Three wild slopes, three perfect splashes. The penguins are cheering!",
      button: "Slide again",
    },
  } as const;
  const message = view.phase === "playing" ? null : overlay[view.phase];

  return (
    <main className="game-shell">
      <header className="hud">
        <div className="level-pill">
          <span>{view.levelIndex + 1}</span>
          {level.name}
        </div>
        <div
          className="progress"
          aria-label={`${Math.round(view.progress * 100)}% to the sea`}
        >
          <div
            className="progress-fill"
            style={{ width: `${view.progress * 100}%` }}
          />
          <span
            className="progress-penguin"
            style={{ left: `${Math.min(94, view.progress * 94)}%` }}
          >
            🐧
          </span>
          <span className="sea">🌊</span>
        </div>
        <button
          className="sound"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMuted(toggleMute());
          }}
          aria-label={muted ? "Turn sound on" : "Mute sound"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>
      <button
        className="play-area"
        type="button"
        onPointerDown={jump}
        aria-label="Jump"
      >
        <canvas ref={canvasRef} />
        {message && (
          <section className="card" aria-live="polite">
            <p className="eyebrow">{message.eyebrow}</p>
            <h1>{message.title}</h1>
            <p>{message.text}</p>
            <span className="action">
              {message.button}
              <b>↑</b>
            </span>
            {view.phase === "intro" && <small>Space, ↑ or tap</small>}
          </section>
        )}
        {view.phase === "playing" && (
          <span className="jump-hint">
            TAP TO JUMP <b>↑</b>
          </span>
        )}
      </button>
    </main>
  );
}
