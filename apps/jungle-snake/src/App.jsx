import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import jungleBackground from "./assets/jungle-background.jpg";
import backgroundMusic from "./assets/music.mp3";

const BOARD_COLS = 20;
const BOARD_ROWS = 18;
const CELL_SIZE = 28;
const START_SPEED = 266;
const MIN_SPEED = 80;
const BABY_COUNT = 4;
const START_LIVES = 3;
const LEVEL_STEP = 220;
const STORAGE_KEY = "jungle-baby-snake-high-score";

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const ENEMY_SPECIES = [
  {
    name: "Emerald Viper",
    stripe: "#ff6b6b",
    pattern: "linear-gradient(135deg, #ff6666 0%, #b10000 50%, #ff4d4d 100%)",
  },
  {
    name: "Red Python",
    stripe: "#ff4f4f",
    pattern: "linear-gradient(120deg, #ff4444 0%, #c70000 60%, #ff7676 100%)",
  },
  {
    name: "Coral Boa",
    stripe: "#ff2a2a",
    pattern: "linear-gradient(145deg, #ff5555 0%, #a80000 52%, #ff8080 100%)",
  },
];

const rand = (n) => Math.floor(Math.random() * n);
let entityId = 0;

const posKey = (cell) => `${cell.x},${cell.y}`;
const samePos = (a, b) => a.x === b.x && a.y === b.y;
const inBounds = (cell) =>
  cell.x >= 0 && cell.x < BOARD_COLS && cell.y >= 0 && cell.y < BOARD_ROWS;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function randomDirection() {
  const options = Object.values(DIRECTIONS);
  return options[rand(4)];
}

function randomEmptyCell(blocked) {
  for (let i = 0; i < 5000; i += 1) {
    const cell = { x: rand(BOARD_COLS), y: rand(BOARD_ROWS) };
    if (!blocked.has(posKey(cell))) return cell;
  }

  for (let y = 0; y < BOARD_ROWS; y += 1) {
    for (let x = 0; x < BOARD_COLS; x += 1) {
      const cell = { x, y };
      if (!blocked.has(posKey(cell))) return cell;
    }
  }

  return { x: 0, y: 0 };
}

function placeEntity(blocked, cell) {
  blocked.add(posKey(cell));
  return cell;
}

function createSnake() {
  const midY = Math.floor(BOARD_ROWS / 2);
  const midX = Math.floor(BOARD_COLS / 2);
  const body = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  const blocked = new Set(body.map(posKey));
  return { body, blocked };
}

function createHuman(blocked) {
  const position = placeEntity(blocked, randomEmptyCell(blocked));
  return {
    id: `human-${(entityId += 1)}`,
    x: position.x,
    y: position.y,
    direction: randomDirection(),
  };
}

function createEnemy(blocked) {
  const head = placeEntity(blocked, randomEmptyCell(blocked));
  const dir = randomDirection();
  const tail = {
    x: head.x - dir.x,
    y: head.y - dir.y,
  };
  if (!inBounds(tail) || blocked.has(posKey(tail))) {
    for (const fallback of Object.values(DIRECTIONS)) {
      const candidate = { x: head.x + fallback.x, y: head.y + fallback.y };
      if (inBounds(candidate) && !blocked.has(posKey(candidate))) {
        return {
          id: `enemy-${(entityId += 1)}`,
          species: ENEMY_SPECIES[rand(ENEMY_SPECIES.length)],
          direction: fallback,
          body: [head, candidate],
        };
      }
    }
  }

  return {
    id: `enemy-${(entityId += 1)}`,
    species: ENEMY_SPECIES[rand(ENEMY_SPECIES.length)],
    direction: dir,
    body: [head, tail],
  };
}

function createBaby(blocked) {
  const point = placeEntity(blocked, randomEmptyCell(blocked));
  return {
    id: `baby-${(entityId += 1)}`,
    x: point.x,
    y: point.y,
  };
}

function initialState(highScore) {
  const snakeInfo = createSnake();
  const blocked = new Set(snakeInfo.blocked);
  const babies = Array.from({ length: BABY_COUNT }, () => createBaby(blocked));
  const enemies = [createEnemy(blocked)];
  const humans = [createHuman(blocked)];
  const food = placeEntity(blocked, randomEmptyCell(blocked));

  return {
    status: "idle",
    level: 1,
    score: 0,
    snake: snakeInfo.body,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    babies,
    enemies,
    humans,
    food,
    hasFruit: false,
    speed: START_SPEED,
    lives: START_LIVES,
    message:
      "Use the arrows or WASD. Pick up fruit, then feed a baby before moving too slowly!",
    soundEvent: null,
    highScore,
    isMuted: false,
  };
}

function setSafeDirection(current, next) {
  if (next.x === -current.x && next.y === -current.y) return current;
  return next;
}

function updateFoodState(food, newHead) {
  if (!food) return [null, false, false];
  if (!samePos(food, newHead)) return [food, false, false];
  return [null, true, true];
}

function chooseEnemyMove(enemy, state, playerSnake, babies, forbidden) {
  const head = enemy.body[0];
  const target = babies.length ? babies[rand(babies.length)] : state.food;

  const options = Object.values(DIRECTIONS)
    .map((dir) => ({ x: head.x + dir.x, y: head.y + dir.y, dir }))
    .filter((cell) => inBounds(cell) && !forbidden.has(posKey(cell)));

  if (!options.length) {
    return {
      x: enemy.direction.x,
      y: enemy.direction.y,
      x2: head.x,
      y2: head.y,
    };
  }

  let best = options[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const base = target ? manhattan(option, target) * 2 : 15;
    const avoidSnake = playerSnake.some((seg) => samePos(seg, option));
    const nearSnake = playerSnake.some((seg) => manhattan(seg, option) <= 1);
    const penalty = (avoidSnake ? 80 : 0) + (nearSnake ? 4 : 0);
    const jitter = Math.random() * 2;
    const score = base + penalty + jitter;
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return { x: best.x - head.x, y: best.y - head.y, x2: best.x, y2: best.y };
}

function moveHuman(human, blocked) {
  const dirs = Object.values(DIRECTIONS);
  let direction = human.direction;

  const tryMove = dirs
    .map((dir) => ({ x: human.x + dir.x, y: human.y + dir.y, dir }))
    .filter((m) => inBounds(m) && !blocked.has(posKey(m)));
  if (!tryMove.length) {
    return { next: human, blocked, changed: false };
  }

  if (Math.random() < 0.25) {
    direction = tryMove[rand(tryMove.length)].dir;
  }

  const candidate = {
    x: human.x + direction.x,
    y: human.y + direction.y,
  };
  if (inBounds(candidate) && !blocked.has(posKey(candidate))) {
    return {
      next: { ...human, ...direction, x: candidate.x, y: candidate.y },
      blocked,
      changed: true,
    };
  }

  const fallback = tryMove[rand(tryMove.length)];
  return {
    next: { ...human, ...fallback.dir, x: fallback.x, y: fallback.y },
    blocked,
    changed: true,
  };
}

function moveBabies(state) {
  const blocked = new Set();
  const bySnake = state.snake.concat(
    state.humans.flatMap((h) => [{ x: h.x, y: h.y }]),
    state.enemies.flatMap((e) => e.body),
  );
  bySnake.forEach((cell) => blocked.add(posKey(cell)));

  const babies = [];
  for (const baby of state.babies) {
    const options = Object.values(DIRECTIONS)
      .map((dir) => ({ x: baby.x + dir.x, y: baby.y + dir.y }))
      .filter((cell) => inBounds(cell) && !blocked.has(posKey(cell)));

    const target = state.food || {
      x: (baby.x + rand(BOARD_COLS)) % BOARD_COLS,
      y: (baby.y + rand(BOARD_ROWS)) % BOARD_ROWS,
    };
    let next = baby;
    if (options.length && Math.random() < 0.55) {
      let best = options[0];
      let bestScore = manhattan(best, target);
      for (const option of options) {
        const score = manhattan(option, target);
        if (score < bestScore) {
          bestScore = score;
          best = option;
        }
      }
      next = best;
    }

    if (!samePos(next, baby)) {
      babies.push({ ...baby, x: next.x, y: next.y });
    } else {
      babies.push(baby);
    }

    blocked.add(posKey(next));
  }

  return babies;
}

function advance(state, highScore, setHighScore) {
  if (state.status !== "running") return state;

  const old = { ...state, message: state.message, soundEvent: null };
  let message = old.message;
  let soundEvent = null;

  const direction = setSafeDirection(state.direction, state.nextDirection);
  const head = state.snake[0];
  const nextHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (
    !inBounds(nextHead) ||
    state.snake.some((seg) => samePos(seg, nextHead))
  ) {
    return {
      ...state,
      status: "lost",
      message: "Crashed into danger in the jungle! Try again.",
      soundEvent: "lost",
      direction,
      nextDirection: direction,
    };
  }

  let snake = [nextHead, ...state.snake];

  let [food, gainedFruit] = updateFoodState(state.food, nextHead);
  let hasFruit = state.hasFruit;
  let score = state.score;
  let hasEvent = false;

  if (gainedFruit) {
    hasFruit = true;
    score += 20;
    message = "Yummy fruit found! Feed a baby now.";
    soundEvent = "pickup";
    hasEvent = true;
    food = state.food;
    food = null;
  }

  let babies = state.babies.map((baby) => ({ ...baby }));
  const snakeHead = nextHead;

  if (hasFruit) {
    const feed = babies.findIndex((baby) => samePos(baby, snakeHead));
    if (feed !== -1) {
      babies.splice(feed, 1);
      score += 70;
      hasFruit = false;
      message = "Baby fed! Keep moving and guard the next one!";
      soundEvent = hasEvent ? "combo" : "feed";
      hasEvent = true;
      const blocked = new Set();
      [
        ...snake,
        ...state.humans.flatMap((h) => [{ x: h.x, y: h.y }]),
        ...state.enemies.flatMap((e) => e.body),
      ].forEach((cell) => blocked.add(posKey(cell)));
      while (babies.length < BABY_COUNT) {
        babies.push(createBaby(blocked));
      }
    }
  }

  let isDead = false;
  let lives = state.lives;
  let shouldShrink = !state.hasFruit;
  let consumedHumans = 0;
  let consumedEnemies = 0;

  let humans = [];
  for (const human of state.humans) {
    if (samePos(human, snakeHead)) {
      consumedHumans += 1;
      score += 50;
      shouldShrink = false;
      message = "You ate a human and got stronger!";
      soundEvent = hasEvent ? "combo" : "pickup";
      hasEvent = true;
      continue;
    }

    humans.push(human);
  }

  let enemies = [];
  for (const enemy of state.enemies) {
    if (enemy.body.some((seg) => samePos(seg, snakeHead))) {
      consumedEnemies += 1;
      score += 90;
      shouldShrink = false;
      message = "You defeated a red snake and rescued the jungle!";
      soundEvent = "combo";
      hasEvent = true;
      continue;
    }
    enemies.push(enemy);
  }

  const blockedForThreat = new Set();
  snake.forEach((cell) => blockedForThreat.add(posKey(cell)));
  humans.forEach((human) => blockedForThreat.add(posKey(human)));
  enemies.forEach((enemy) =>
    enemy.body.forEach((seg) => blockedForThreat.add(posKey(seg))),
  );
  babies.forEach((baby) => blockedForThreat.add(posKey(baby)));

  if (consumedHumans > 0) {
    const blocked = new Set(blockedForThreat);
    for (let i = 0; i < consumedHumans * 2; i += 1) {
      humans.push(createHuman(blocked));
      blocked.add(posKey(humans[humans.length - 1]));
    }
    message =
      "Your jungle is still full of humans, but two more just wandered in!";
    soundEvent = hasEvent ? soundEvent : "feed";
  }

  if (consumedEnemies > 0) {
    const blocked = new Set(blockedForThreat);
    for (let i = 0; i < consumedEnemies * 2; i += 1) {
      enemies.push(createEnemy(blocked));
      enemies[enemies.length - 1].body.forEach((seg) =>
        blocked.add(posKey(seg)),
      );
    }
    message = "You ate a red snake, and more snakes moved in!";
    soundEvent = hasEvent ? soundEvent : "combo";
  }

  if (shouldShrink) {
    snake = snake.slice(0, -1);
  }

  const movedHumans = [];
  for (const human of humans) {
    const move = moveHuman(human, blockedForThreat);
    const moved = move.next;

    let savedBabies = [...babies];
    const babyIndex = savedBabies.findIndex((baby) => samePos(baby, moved));
    if (babyIndex >= 0) {
      savedBabies.splice(babyIndex, 1);
      lives -= 1;
      soundEvent = isDead ? "lost" : "babyLost";
      babies = savedBabies;
    }

    movedHumans.push(moved);
  }

  humans = movedHumans;

  const enemyBlocked = new Set(blockedForThreat);
  enemies.forEach((enemy) =>
    enemy.body.forEach((seg) => enemyBlocked.delete(posKey(seg))),
  );

  const movedEnemies = [];
  for (const enemy of enemies) {
    enemy.body.forEach((seg) => enemyBlocked.add(posKey(seg)));

    const next = chooseEnemyMove(enemy, state, snake, babies, enemyBlocked);
    const newHead = { x: next.x2, y: next.y2 };
    enemy.body.forEach((seg) => enemyBlocked.delete(posKey(seg)));

    const newBody = [newHead, ...enemy.body.slice(0, -1)];
    const eatsBaby = babies.findIndex((baby) => samePos(baby, newHead));
    if (eatsBaby >= 0) {
      babies.splice(eatsBaby, 1);
      lives -= 1;
      soundEvent = isDead ? "lost" : "babyLost";
    }

    if (newBody.some((seg) => samePos(seg, snakeHead))) {
      isDead = true;
    }

    newBody.forEach((seg) => enemyBlocked.add(posKey(seg)));
    movedEnemies.push({
      ...enemy,
      body: newBody,
      direction: { x: next.x, y: next.y },
      species: enemy.species,
    });
  }
  enemies = movedEnemies;

  while (babies.length < BABY_COUNT) {
    const blocked = new Set();
    [...snake, ...humans, ...enemies.flatMap((e) => e.body)].forEach((cell) =>
      blocked.add(posKey(cell)),
    );
    babies.push(createBaby(blocked));
    score += 12;
  }

  babies = moveBabies({
    ...state,
    babies,
    snake,
    humans,
    enemies,
  });

  if (!food && Math.random() < 0.85) {
    const blocked = new Set();
    [...snake, ...humans, ...enemies.flatMap((e) => e.body), ...babies].forEach(
      (cell) => blocked.add(posKey(cell)),
    );
    food = randomEmptyCell(blocked);
    if (Math.random() < 0.25) {
      message = "A fresh fruit appeared in the jungle canopy.";
      soundEvent = hasEvent ? soundEvent : "found";
      hasEvent = true;
    }
  }

  if (babies.length === 0) {
    for (let i = 0; i < BABY_COUNT; i += 1) {
      const blocked = new Set();
      [...snake, ...humans, ...enemies.flatMap((e) => e.body)].forEach((cell) =>
        blocked.add(posKey(cell)),
      );
      babies.push(createBaby(blocked));
    }
    message = "You protected all babies this wave! More babies join.";
    score += 120;
    soundEvent = hasEvent ? soundEvent : "level";
    hasEvent = true;
  }

  const newLevel = Math.floor(score / LEVEL_STEP) + 1;
  if (newLevel > state.level) {
    const difficulty = newLevel - state.level;
    for (let i = 0; i < difficulty; i += 1) {
      if (newLevel % 2 === 0 && enemies.length < 5) {
        const blocked = new Set();
        [
          ...snake,
          ...humans,
          ...enemies.flatMap((e) => e.body),
          ...babies,
        ].forEach((cell) => blocked.add(posKey(cell)));
        enemies.push(createEnemy(blocked));
      }

      if (newLevel % 3 === 0 && humans.length < 3) {
        const blocked = new Set();
        [
          ...snake,
          ...humans,
          ...enemies.flatMap((e) => e.body),
          ...babies,
        ].forEach((cell) => blocked.add(posKey(cell)));
        humans.push(createHuman(blocked));
      }
    }

    message = `Level ${newLevel} unlocked: jungle movement got sharper!`;
    soundEvent = "level";
    old.score = score;
  }

  if (lives <= 0) {
    isDead = true;
    message = "Too many babies were taken. Jungle rescue failed.";
    soundEvent = "lost";
  }

  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem(STORAGE_KEY, String(score));
  }

  if (isDead) {
    return {
      ...old,
      status: "lost",
      snake,
      direction,
      nextDirection: direction,
      babies,
      enemies,
      humans,
      food,
      hasFruit,
      score,
      message,
      soundEvent: "lost",
      speed: state.speed,
      level: newLevel,
      lives: Math.max(0, lives),
    };
  }

  return {
    ...old,
    status: "running",
    snake,
    direction,
    nextDirection: direction,
    babies,
    enemies,
    humans,
    food,
    hasFruit,
    score,
    speed: Math.max(MIN_SPEED, state.speed),
    message,
    soundEvent,
    level: newLevel,
    lives: Math.max(0, lives),
  };
}

function makeGrid(state) {
  const grid = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({ kind: "empty" })),
  );

  const place = (cell, type) => {
    if (!inBounds(cell)) return;
    grid[cell.y][cell.x] = { kind: type };
  };

  state.babies.forEach((baby) => place(baby, "baby"));
  if (state.food) place(state.food, "food");
  state.humans.forEach((human) => place(human, "human"));
  state.enemies.forEach((enemy) => {
    enemy.body.forEach((seg, i) =>
      place(seg, i === 0 ? "enemy-head" : "enemy-body"),
    );
  });

  state.snake.forEach((seg, i) =>
    place(seg, i === 0 ? "player-head" : "snake-body"),
  );

  return grid;
}

function createTone(
  ctx,
  frequency,
  duration = 0.12,
  type = "sine",
  volume = 0.1,
) {
  const startTime = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function App() {
  const startHighScore = Number(localStorage.getItem(STORAGE_KEY) || "0");
  const [state, setState] = useState(() => initialState(startHighScore));
  const [highScore, setHighScore] = useState(startHighScore);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const touchRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const DRAG_MIN = 12;

  useEffect(() => {
    const handleKey = (event) => {
      const key = DIRECTIONS[event.key];
      if (!key) {
        return;
      }
      event.preventDefault();
      setState((prev) => {
        if (prev.status !== "running") {
          return prev.status === "idle"
            ? {
                ...prev,
                status: "running",
                nextDirection: key,
                message: "Protect the babies and feed them the fruit.",
              }
            : prev;
        }

        return {
          ...prev,
          nextDirection: setSafeDirection(prev.direction, key),
        };
      });

      if (audioRef.current && audioRef.current.state === "suspended") {
        audioRef.current.resume();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (state.status !== "running") return;
    const timer = setInterval(() => {
      setState((prev) => advance(prev, highScore, setHighScore));
    }, state.speed);
    return () => clearInterval(timer);
  }, [state.status, state.speed, highScore]);

  useEffect(() => {
    if (!state.soundEvent) return;

    if (state.isMuted) {
      setState((prev) => ({ ...prev, soundEvent: null }));
      return;
    }

    if (!audioRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioRef.current = new AC();
    }

    if (audioRef.current.state === "suspended") {
      audioRef.current.resume();
    }

    const ctx = audioRef.current;

    switch (state.soundEvent) {
      case "pickup":
        createTone(ctx, 550, 0.08, "triangle", 0.04);
        setTimeout(() => createTone(ctx, 760, 0.08, "triangle", 0.04), 80);
        break;
      case "feed":
        createTone(ctx, 880, 0.12, "triangle", 0.06);
        setTimeout(() => createTone(ctx, 990, 0.12, "triangle", 0.05), 90);
        setTimeout(() => createTone(ctx, 1080, 0.12, "triangle", 0.05), 180);
        break;
      case "combo":
        createTone(ctx, 620, 0.07, "square", 0.05);
        setTimeout(() => createTone(ctx, 830, 0.07, "square", 0.05), 80);
        setTimeout(() => createTone(ctx, 1040, 0.08, "square", 0.05), 150);
        break;
      case "babyLost":
        createTone(ctx, 200, 0.16, "sawtooth", 0.1);
        setTimeout(() => createTone(ctx, 150, 0.2, "sawtooth", 0.12), 90);
        break;
      case "level":
        createTone(ctx, 340, 0.1, "triangle", 0.05);
        setTimeout(() => createTone(ctx, 420, 0.1, "triangle", 0.05), 100);
        setTimeout(() => createTone(ctx, 520, 0.12, "triangle", 0.05), 180);
        break;
      case "found":
        createTone(ctx, 980, 0.06, "square", 0.04);
        break;
      case "lost":
        createTone(ctx, 140, 0.4, "sawtooth", 0.15);
        break;
      default:
        break;
    }

    setState((prev) => ({ ...prev, soundEvent: null }));
  }, [state.soundEvent]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    music.volume = 0.18;
    music.muted = state.isMuted;

    if (state.status === "running" && !state.isMuted) {
      const playPromise = music.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {});
      }
      return;
    }

    music.pause();
    if (state.status !== "running" && state.status !== "paused") {
      music.currentTime = 0;
    }
  }, [state.status, state.isMuted]);

  const grid = useMemo(() => makeGrid(state), [state]);

  const togglePause = () => {
    setState((prev) => {
      if (prev.status === "running")
        return {
          ...prev,
          status: "paused",
          message: "Paused - keep them calm!",
        };
      if (prev.status === "paused")
        return { ...prev, status: "running", message: "Jungle run resumed!" };
      return prev;
    });
  };

  const startGame = () => {
    setState(initialState(highScore));
    setState((prev) => ({
      ...prev,
      status: "running",
      message: "Go find food and feed the babies.",
    }));
  };

  const setDirection = (x, y) => {
    if (state.status === "running") {
      const next = setSafeDirection(state.direction, { x, y });
      setState((prev) => ({ ...prev, nextDirection: next }));
    }
  };

  const startFromTouch = () => {
    setState((prev) => {
      if (prev.status !== "idle") return prev;
      return {
        ...prev,
        status: "running",
        message: "Keep the babies safe with your new jungle drag controls.",
      };
    });
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    startFromTouch();

    touchRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
    };

    if (event.cancelable) event.preventDefault();
  };

  const applyDragDirection = (dx, dy) => {
    if (Math.abs(dx) < DRAG_MIN && Math.abs(dy) < DRAG_MIN) return;
    const next =
      Math.abs(dx) > Math.abs(dy)
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 };

    setState((prev) => {
      if (prev.status !== "running") {
        return prev.status === "idle"
          ? {
              ...prev,
              status: "running",
              nextDirection: next,
              message:
                "Keep the babies safe with your new jungle drag controls.",
            }
          : prev;
      }

      return {
        ...prev,
        nextDirection: setSafeDirection(prev.direction, next),
      };
    });
  };

  const handleTouchMove = (event) => {
    if (!touchRef.current.active) return;
    const touch = event.touches?.[0];
    if (!touch) return;

    const dx = touch.clientX - touchRef.current.lastX;
    const dy = touch.clientY - touchRef.current.lastY;
    applyDragDirection(dx, dy);
    touchRef.current.lastX = touch.clientX;
    touchRef.current.lastY = touch.clientY;

    if (event.cancelable) event.preventDefault();
  };

  const handleTouchEnd = () => {
    touchRef.current.active = false;
  };

  const stars = useMemo(() => {
    const count = Math.floor((state.score / LEVEL_STEP) * 3);
    return Array.from({ length: 3 }, (_, index) => index < count);
  }, [state.score]);

  const nextLevelScore = state.level * LEVEL_STEP - state.score;

  const heartIcons = Array.from(
    { length: Math.max(state.lives, 0) },
    (_, idx) => idx,
  );

  const jungleBackdrop = `linear-gradient(rgba(20, 48, 24, 0.72), rgba(17, 44, 20, 0.72)), url(${jungleBackground})`;

  return (
    <div
      className="app-shell"
      style={{
        backgroundImage: jungleBackdrop,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="title-panel">
        <h1>Jungle Baby Snake Rescue</h1>
        <p>
          Play as the purple hero snake. Carry jungle fruit, feed your green
          babies, and avoid brown humans and red enemy snakes.
        </p>
      </div>

      <div className="hud">
        <div className="metric metric-big">
          <span>Score</span>
          <strong>{state.score}</strong>
        </div>
        <div className="metric">
          <span>High score</span>
          <strong>{highScore}</strong>
        </div>
        <div className="metric">
          <span>Level</span>
          <strong>{state.level}</strong>
        </div>
        <div className="metric">
          <span>Next level</span>
          <strong>{nextLevelScore}</strong>
        </div>
        <div className="metric metric-lives">
          <span>Lives</span>
          <strong>
            {heartIcons.length ? "💚".repeat(heartIcons.length) : "🌧"}
          </strong>
        </div>
        <div className="metric metric-badge">
          <span>Status</span>
          <strong>{state.hasFruit ? "Carrying fruit" : "Searching"}</strong>
        </div>
      </div>

      <div className="board-wrap">
        <div
          className="board"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            "--cols": BOARD_COLS,
            "--rows": BOARD_ROWS,
            width: `${Math.min(BOARD_COLS * CELL_SIZE, window.innerWidth - 64)}px`,
            height: `${Math.min(BOARD_ROWS * CELL_SIZE, window.innerWidth - 64)}px`,
            backgroundImage: `linear-gradient(rgba(20, 48, 24, 0.65), rgba(17, 44, 20, 0.72)), url(${jungleBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {grid.flatMap((row, y) =>
            row.map((cell, x) => (
              <div key={`${x}-${y}`} className={`cell ${cell.kind}`} />
            )),
          )}
        </div>

        <div className="legend">
          <span className="legend-item legend-player" /> You
          <span className="legend-item legend-baby" /> Babies
          <span className="legend-item legend-food" /> Fruit
          <span className="legend-item legend-human" /> Human
          <span className="legend-item legend-enemy" /> Enemy
        </div>
      </div>

      <div className="control-panel">
        <button
          type="button"
          onClick={state.status === "running" ? togglePause : startGame}
        >
          {state.status === "running"
            ? "Pause"
            : state.status === "paused"
              ? "Resume"
              : "Start"}
        </button>
        <button type="button" onClick={startGame}>
          Restart
        </button>
        <button
          type="button"
          onClick={() =>
            setState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
          }
        >
          {state.isMuted ? "Unmute" : "Mute"}
        </button>
      </div>

      <div className="mobile-controls" aria-label="touch controls">
        <button
          type="button"
          onClick={() => setDirection(0, -1)}
          className="btn-up"
        >
          ⬆
        </button>
        <div className="mobile-row">
          <button type="button" onClick={() => setDirection(-1, 0)}>
            ⬅
          </button>
          <button type="button" onClick={() => setDirection(1, 0)}>
            ➡
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDirection(0, 1)}
          className="btn-down"
        >
          ⬇
        </button>
      </div>

      <div className="message-bar">{state.message}</div>

      <audio
        ref={musicRef}
        src={backgroundMusic}
        loop
        preload="auto"
        playsInline
      />

      <div className="level-stars" aria-hidden="true">
        {stars.map((lit, idx) => (
          <span key={idx}>{lit ? "🌟" : "✦"}</span>
        ))}
      </div>

      {state.status === "lost" && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Rescue ended!</h2>
            <p>Final score: {state.score}</p>
            <p>{state.message}</p>
            <button type="button" onClick={startGame}>
              Rescue again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
