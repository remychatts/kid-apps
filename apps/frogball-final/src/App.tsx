/** Runs the one-thumb Frogball Final match and its animated presentation. */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Phase = "welcome" | "match" | "shootout" | "finished";
type ChoiceKind = "pass" | "dribble" | "shoot" | "press" | "tackle" | "guard";

type Choice = {
  kind: ChoiceKind;
  icon: string;
  label: string;
  hint: string;
};

type MatchState = {
  phase: Phase;
  seconds: number;
  us: number;
  them: number;
  possession: boolean;
  position: number;
  momentum: number;
  message: string;
  commentary: string;
  playNumber: number;
  lastResult: "idle" | "good" | "bad" | "goal";
};

const INITIAL_STATE: MatchState = {
  phase: "welcome",
  seconds: 90,
  us: 0,
  them: 0,
  possession: true,
  position: 0,
  momentum: 1,
  message: "The crowd is hopping!",
  commentary: "You are captain of the Lily Pad Legends.",
  playNumber: 0,
  lastResult: "idle",
};

const ATTACK_CHOICES: Record<"build" | "attack" | "chance", Choice[]> = {
  build: [
    { kind: "pass", icon: "🎯", label: "Quick pass", hint: "Safe and clever" },
    { kind: "dribble", icon: "💨", label: "Hop past", hint: "Bold and bouncy" },
    { kind: "shoot", icon: "🚀", label: "Long shot", hint: "A huge leap" },
  ],
  attack: [
    {
      kind: "pass",
      icon: "🪄",
      label: "Through ball",
      hint: "Split the defence",
    },
    { kind: "dribble", icon: "⚡", label: "Super hop", hint: "Take them on" },
    {
      kind: "shoot",
      icon: "🥅",
      label: "Have a shot",
      hint: "Test the keeper",
    },
  ],
  chance: [
    { kind: "shoot", icon: "🔥", label: "Power shot", hint: "Smash it!" },
    { kind: "shoot", icon: "🎨", label: "Curler", hint: "Bend it round" },
    { kind: "pass", icon: "🐸", label: "Square pass", hint: "Find a friend" },
  ],
};

const DEFENCE_CHOICES: Choice[] = [
  {
    kind: "press",
    icon: "📣",
    label: "Press together",
    hint: "Close every gap",
  },
  { kind: "tackle", icon: "🦶", label: "Big tackle", hint: "Win it now" },
  { kind: "guard", icon: "🛡️", label: "Guard the goal", hint: "Stay frosty" },
];

/** Returns the decisions that suit the current patch of the pitch. */
function getChoices(state: MatchState) {
  if (!state.possession) return DEFENCE_CHOICES;
  if (state.position >= 2) return ATTACK_CHOICES.chance;
  if (state.position >= 1) return ATTACK_CHOICES.attack;
  return ATTACK_CHOICES.build;
}

/** Formats the match clock as a familiar football minute. */
function matchMinute(seconds: number) {
  return `${Math.min(90, 90 - seconds + 1)}′`;
}

/** Plays tiny synthesised game sounds after a player gesture unlocks audio. */
function playSound(
  sound: "tap" | "good" | "bad" | "goal" | "whistle",
  muted: boolean,
) {
  if (muted) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = {
    tap: [440],
    good: [440, 620],
    bad: [240, 180],
    goal: [392, 523, 659, 784],
    whistle: [1100, 880],
  }[sound];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * (sound === "goal" ? 0.1 : 0.07);
    oscillator.type = sound === "bad" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      sound === "goal" ? 0.12 : 0.07,
      start + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.19);
  });
  window.setTimeout(() => void context.close(), 800);
}

/** Chooses one line of commentary to keep repeat matches fresh. */
function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Converts a choice into one lively passage of play. */
function resolvePlay(previous: MatchState, choice: Choice): MatchState {
  const chance: Record<ChoiceKind, number> = {
    pass: previous.position >= 2 ? 0.74 : 0.82,
    dribble: 0.62,
    shoot: previous.position >= 2 ? 0.64 : previous.position >= 1 ? 0.38 : 0.16,
    press: 0.58,
    tackle: 0.48,
    guard: 0.72,
  };
  const success =
    Math.random() < chance[choice.kind] + previous.momentum * 0.025;
  const elapsed = 6 + Math.floor(Math.random() * 4);
  const nextSeconds = Math.max(0, previous.seconds - elapsed);
  let next: MatchState = {
    ...previous,
    seconds: nextSeconds,
    playNumber: previous.playNumber + 1,
    lastResult: success ? "good" : "bad",
  };

  if (previous.possession) {
    if (choice.kind === "shoot") {
      if (success) {
        next = {
          ...next,
          us: previous.us + 1,
          possession: false,
          position: 0,
          momentum: Math.min(3, previous.momentum + 1),
          lastResult: "goal",
          message: "GOOOOAL!",
          commentary: pick([
            "An un-frog-ettable finish! The net is still wobbling.",
            "Top lily pad! The stadium erupts.",
            "What a strike! Even the tadpoles are cheering.",
          ]),
        };
      } else {
        next = {
          ...next,
          possession: false,
          position: Math.max(-1, previous.position - 1),
          momentum: Math.max(0, previous.momentum - 1),
          message: "So close!",
          commentary: pick([
            "The keeper gets a slippery glove to it.",
            "It whistles past the post. Keep hopping!",
            "Saved! Bog United spring onto the ball.",
          ]),
        };
      }
    } else if (success) {
      next = {
        ...next,
        position: Math.min(2, previous.position + 1),
        momentum: Math.min(3, previous.momentum + 1),
        message: choice.kind === "pass" ? "Lovely football!" : "What a hop!",
        commentary: pick([
          "The crowd croaks your name.",
          "Bog United are all tangled up!",
          "Green shirts flood forwards.",
        ]),
      };
    } else {
      next = {
        ...next,
        possession: false,
        position: Math.max(-1, previous.position - 1),
        momentum: Math.max(0, previous.momentum - 1),
        message: "Bog United nick it!",
        commentary: "No time to sulk — win that ball back.",
      };
    }
  } else if (success) {
    next = {
      ...next,
      possession: true,
      position: Math.min(1, previous.position + 1),
      momentum: Math.min(3, previous.momentum + 1),
      message: choice.kind === "guard" ? "Safe hands!" : "Ball won!",
      commentary: pick([
        "A brilliant bit of froggy defending.",
        "Now leap onto the attack!",
        "The orange end of the stadium goes wild.",
      ]),
    };
  } else {
    const danger = previous.position <= -1 && Math.random() < 0.52;
    next = danger
      ? {
          ...next,
          them: previous.them + 1,
          possession: true,
          position: 0,
          momentum: Math.max(0, previous.momentum - 1),
          lastResult: "bad",
          message: "Bog United score!",
          commentary: "Shake off the pond water. There is time to bounce back!",
        }
      : {
          ...next,
          position: Math.max(-2, previous.position - 1),
          momentum: Math.max(0, previous.momentum - 1),
          message: "They're getting closer!",
          commentary: "Bog United hop through. Protect the lily pad!",
        };
  }

  if (nextSeconds === 0) {
    if (next.us === next.them) {
      return {
        ...next,
        phase: "shootout",
        message: "Penalty shoot-out!",
        commentary: "One kick for the cup. Pick your corner!",
      };
    }
    return { ...next, phase: "finished" };
  }
  return next;
}

/** Renders a trail of celebratory pieces for goals and wins. */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 38 }, (_, index) => (
        <i
          key={index}
          style={
            {
              "--x": `${(index * 37) % 100}%`,
              "--delay": `${(index % 10) * -0.11}s`,
              "--spin": `${180 + (index % 5) * 75}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Draws the small frog teams and ball on the vertical phone pitch. */
function Pitch({ state }: { state: MatchState }) {
  const ballTop = 50 - state.position * 17;
  const usTop = Math.min(76, ballTop + (state.possession ? 3 : 10));
  const themTop = Math.max(20, ballTop - (state.possession ? 10 : 3));
  return (
    <div
      className={`pitch result-${state.lastResult}`}
      aria-label="Animated football pitch"
    >
      <div className="pitch-glow" />
      <div className="goal goal-away">
        <span />
      </div>
      <div className="penalty-box box-away" />
      <div className="halfway-line" />
      <div className="centre-circle" />
      <div className="penalty-box box-home" />
      <div className="goal goal-home">
        <span />
      </div>
      <div className="frog away keeper" style={{ top: "9%", left: "50%" }}>
        🐸
      </div>
      <div className="frog away" style={{ top: `${themTop}%`, left: "34%" }}>
        🐸
      </div>
      <div
        className="frog away"
        style={{ top: `${Math.max(18, themTop - 4)}%`, left: "70%" }}
      >
        🐸
      </div>
      <div className="frog home" style={{ top: `${usTop}%`, left: "48%" }}>
        🐸
      </div>
      <div
        className="frog home"
        style={{ top: `${Math.min(80, usTop + 7)}%`, left: "20%" }}
      >
        🐸
      </div>
      <div className="frog home keeper" style={{ top: "86%", left: "50%" }}>
        🐸
      </div>
      <div className="ball" style={{ top: `${ballTop}%` }}>
        ⚽
      </div>
      {state.lastResult === "goal" && <div className="goal-burst">GOAL!</div>}
    </div>
  );
}

/** Presents the pre-match invitation and the only rules children need. */
function Welcome({
  onStart,
  muted,
  onMute,
}: {
  onStart: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  return (
    <main className="welcome-screen">
      <button
        className="sound-toggle floating"
        type="button"
        onClick={onMute}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <div className="stadium-lights" aria-hidden="true" />
      <section className="welcome-card">
        <div className="cup-pill">🏆 THE BIG POND CUP</div>
        <img
          className="hero-frog"
          src="./icon-512.png"
          alt="A cheerful frog footballer"
        />
        <p className="eyebrow">YOU ARE THE CAPTAIN</p>
        <h1>
          <span>Frogball</span> Final!
        </h1>
        <p className="intro">
          Make the big decisions. Score the goals. Lift the cup!
        </p>
        <button className="kickoff-button" type="button" onClick={onStart}>
          <span>⚽</span> Kick off!
        </button>
        <div className="how-to">
          <span>👆 Pick a move</span>
          <span>⏱️ 90-second final</span>
        </div>
      </section>
    </main>
  );
}

/** Runs the sudden-death kick when a match ends level. */
function Shootout({
  state,
  muted,
  onFinish,
}: {
  state: MatchState;
  muted: boolean;
  onFinish: (won: boolean) => void;
}) {
  const takeKick = () => {
    const won = Math.random() < 0.72;
    playSound(won ? "goal" : "bad", muted);
    window.setTimeout(() => onFinish(won), 450);
  };
  return (
    <main className="shootout-screen">
      <div className="shootout-card">
        <div className="penalty-ball">⚽</div>
        <p className="eyebrow">
          FULL TIME: {state.us}–{state.them}
        </p>
        <h1>One kick for the cup!</h1>
        <p>The keeper is wobbling. Where will you shoot?</p>
        <div className="shootout-buttons">
          <button type="button" onClick={takeKick}>
            ↖️<span>Left</span>
          </button>
          <button type="button" onClick={takeKick}>
            ⬆️<span>Middle</span>
          </button>
          <button type="button" onClick={takeKick}>
            ↗️<span>Right</span>
          </button>
        </div>
      </div>
    </main>
  );
}

/** Coordinates screens, sounds, decisions and match restarts. */
export function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [muted, setMuted] = useState(false);
  const previousResult = useRef(state.lastResult);

  useEffect(() => {
    if (state.lastResult === previousResult.current) return;
    previousResult.current = state.lastResult;
    if (state.lastResult !== "idle") playSound(state.lastResult, muted);
  }, [muted, state.lastResult]);

  const start = () => {
    playSound("whistle", muted);
    setState({
      ...INITIAL_STATE,
      phase: "match",
      message: "Kick-off!",
      commentary: "The Lily Pad Legends are on the ball.",
    });
  };

  if (state.phase === "welcome")
    return (
      <Welcome
        onStart={start}
        muted={muted}
        onMute={() => setMuted((value) => !value)}
      />
    );
  if (state.phase === "shootout") {
    return (
      <Shootout
        state={state}
        muted={muted}
        onFinish={(won) =>
          setState((current) => ({
            ...current,
            phase: "finished",
            us: current.us + (won ? 1 : 0),
            them: current.them + (won ? 0 : 1),
            message: won ? "Cup winners!" : "So close!",
          }))
        }
      />
    );
  }

  if (state.phase === "finished") {
    const won = state.us > state.them;
    return (
      <main className={`finished-screen ${won ? "won" : "lost"}`}>
        {won && <Confetti />}
        <section className="finished-card">
          <div className="trophy">{won ? "🏆" : "🐸"}</div>
          <p className="eyebrow">FULL TIME</p>
          <h1>{won ? "Pond Cup champions!" : "A brilliant battle!"}</h1>
          <div className="final-score">
            <span>LEGENDS</span>
            <strong>
              {state.us} – {state.them}
            </strong>
            <span>BOG UTD</span>
          </div>
          <p>
            {won
              ? "You made the big calls and your frogs made history!"
              : "Bog United win this one — but champions always hop back."}
          </p>
          <button className="kickoff-button" type="button" onClick={start}>
            <span>🔁</span> Play again
          </button>
        </section>
      </main>
    );
  }

  const choices = getChoices(state);
  return (
    <main className="game-screen">
      {state.lastResult === "goal" && <Confetti />}
      <header className="scoreboard">
        <div className="team home-team">
          <span className="mini-shirt">●</span>
          <b>LEGENDS</b>
        </div>
        <div className="score">
          <strong>
            {state.us} – {state.them}
          </strong>
          <span>{matchMinute(state.seconds)}</span>
        </div>
        <div className="team away-team">
          <b>BOG UTD</b>
          <span className="mini-shirt">●</span>
        </div>
        <button
          className="sound-toggle"
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>
      <section className="match-layout">
        <div className="commentary-card" key={state.playNumber}>
          <span
            className={`possession-chip ${state.possession ? "ours" : "theirs"}`}
          >
            {state.possession ? "🟠 YOUR BALL" : "🟣 DEFEND!"}
          </span>
          <h2>{state.message}</h2>
          <p>{state.commentary}</p>
          <div
            className="momentum"
            aria-label={`Team buzz ${state.momentum} out of 3`}
          >
            <span>TEAM BUZZ</span>
            {[1, 2, 3].map((level) => (
              <i className={level <= state.momentum ? "lit" : ""} key={level}>
                ⚡
              </i>
            ))}
          </div>
        </div>
        <Pitch state={state} />
        <section className="decision-panel" aria-labelledby="decision-title">
          <div className="decision-heading">
            <span>CAPTAIN, YOU DECIDE</span>
            <h2 id="decision-title">What should the frogs do?</h2>
          </div>
          <div className="choice-grid">
            {choices.map((choice) => (
              <button
                type="button"
                key={`${state.playNumber}-${choice.label}`}
                onClick={() => {
                  playSound("tap", muted);
                  setState((current) => resolvePlay(current, choice));
                }}
              >
                <span className="choice-icon">{choice.icon}</span>
                <strong>{choice.label}</strong>
                <small>{choice.hint}</small>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
