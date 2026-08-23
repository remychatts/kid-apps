/**
 * Implements the complete single-phone Imposter game flow and its private reveal states.
 */
import { useEffect, useRef, useState } from "react";
import { playSound } from "./sound";
import { WORDS, type WordCard } from "./words";

type Phase = "setup" | "handover" | "reveal" | "play";

type Game = {
  card: WordCard;
  clue: string;
  imposter: number;
};

/** Chooses a random integer from zero up to, but excluding, the limit. */
function randomIndex(limit: number): number {
  return Math.floor(Math.random() * limit);
}

/** Creates a game from a word not previously used during this app session. */
function createGame(playerCount: number, usedWords: Set<string>): Game {
  const choices = WORDS.filter(({ word }) => !usedWords.has(word));
  const card = choices[randomIndex(choices.length)];
  usedWords.add(card.word);

  return {
    card,
    clue: card.clues[randomIndex(card.clues.length)],
    imposter: randomIndex(playerCount),
  };
}

/** Renders the installable pass-the-phone party game. */
export default function App() {
  const [playerCount, setPlayerCount] = useState(4);
  const [phase, setPhase] = useState<Phase>("setup");
  const [game, setGame] = useState<Game | null>(null);
  const [revealPlayer, setRevealPlayer] = useState(0);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("imposter-muted") === "true",
  );
  const [showHelp, setShowHelp] = useState(false);
  const usedWords = useRef(new Set<string>());

  /** Persists the mute preference between visits. */
  useEffect(() => {
    localStorage.setItem("imposter-muted", String(muted));
  }, [muted]);

  /** Covers a visible secret whenever the app moves into the background. */
  useEffect(() => {
    function coverSecret(): void {
      if (document.hidden && phase === "reveal") {
        setPhase("handover");
      }
    }

    document.addEventListener("visibilitychange", coverSecret);
    return () => document.removeEventListener("visibilitychange", coverSecret);
  }, [phase]);

  /** Starts a newly randomised game using the selected player count. */
  function startGame(): void {
    playSound("reveal", muted);
    setGame(createGame(playerCount, usedWords.current));
    setRevealPlayer(0);
    setPhase("handover");
  }

  /** Reveals the current player's private card. */
  function revealCard(): void {
    playSound("reveal", muted);
    setPhase("reveal");
  }

  /** Hides the card and advances to the next player or the play prompt. */
  function finishReveal(): void {
    if (revealPlayer + 1 < playerCount) {
      playSound("tap", muted);
      setRevealPlayer((player) => player + 1);
      setPhase("handover");
      return;
    }

    playSound("vote", muted);
    setPhase("play");
  }

  /** Changes the player count while enforcing the supported range. */
  function changePlayerCount(delta: number): void {
    playSound("tap", muted);
    setPlayerCount((count) => Math.min(8, Math.max(3, count + delta)));
  }

  /** Returns to setup without exposing the previous game's answer. */
  function returnToSetup(): void {
    playSound("tap", muted);
    setGame(null);
    setPhase("setup");
  }

  return (
    <main className={`app phase-${phase}`}>
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <header className="topbar">
        <button
          className="icon-button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Turn sound on" : "Mute sound"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <div className="mini-logo">
          <span>?</span> IMPOSTER!
        </div>
        <button
          className="icon-button"
          onClick={() => setShowHelp(true)}
          aria-label="How to play"
        >
          ?
        </button>
      </header>

      <section className="screen" aria-live="polite">
        {phase === "setup" && (
          <div className="panel setup-panel">
            <div className="eyebrow">PASS • PLAY • PRETEND</div>
            <h1>
              Who’s hiding
              <br />
              in plain sight?
            </h1>
            <p className="lede">
              Everyone gets the word. Well… almost everyone.
            </p>
            <div className="player-picker">
              <span className="picker-label">How many players?</span>
              <div className="stepper">
                <button
                  onClick={() => changePlayerCount(-1)}
                  disabled={playerCount === 3}
                  aria-label="Fewer players"
                >
                  −
                </button>
                <strong>{playerCount}</strong>
                <button
                  onClick={() => changePlayerCount(1)}
                  disabled={playerCount === 8}
                  aria-label="More players"
                >
                  +
                </button>
              </div>
              <span className="picker-hint">3–8 players • one phone</span>
            </div>
            <button className="primary-button" onClick={startGame}>
              Start game <span>→</span>
            </button>
          </div>
        )}

        {phase === "handover" && game && (
          <div className="panel centre-panel">
            <div className="player-badge">
              PLAYER {revealPlayer + 1} OF {playerCount}
            </div>
            <div className="phone-illustration">
              <span>✦</span>
              <b>?</b>
            </div>
            <h2>Pass the phone</h2>
            <p>Only Player {revealPlayer + 1} should look at the screen.</p>
            <button className="primary-button" onClick={revealCard}>
              I’m Player {revealPlayer + 1} <span>→</span>
            </button>
          </div>
        )}

        {phase === "reveal" && game && (
          <div
            className={`panel centre-panel role-panel ${revealPlayer === game.imposter ? "is-imposter" : "is-player"}`}
          >
            <button
              className="panel-touch-target"
              onClick={finishReveal}
              aria-label={
                revealPlayer + 1 === playerCount
                  ? "Hide card and start playing"
                  : "Hide card and pass the phone"
              }
            />
            <div className="player-badge">PLAYER {revealPlayer + 1}</div>
            {revealPlayer === game.imposter ? (
              <>
                <div className="role-icon">🕵️</div>
                <div className="eyebrow">KEEP IT SECRET</div>
                <h2>You’re the imposter!</h2>
                <p className="role-copy">Blend in. Your only clue is:</p>
                <div className="secret-card">
                  <small>YOUR CLUE</small>
                  <strong>{game.clue}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="role-icon">✨</div>
                <div className="eyebrow">REMEMBER THIS</div>
                <h2>The secret word is…</h2>
                <div className="secret-card">
                  <small>{game.card.category}</small>
                  <strong>{game.card.word}</strong>
                </div>
              </>
            )}
            <p className="role-copy">
              Hide the screen and pass the phone. Keep quiet for now!
            </p>
            <div className="primary-button visual-button" aria-hidden="true">
              {revealPlayer + 1 === playerCount ? "Hide & play" : "Hide & pass"}{" "}
              <span>→</span>
            </div>
          </div>
        )}

        {phase === "play" && (
          <div className="panel centre-panel vote-panel">
            <div className="vote-burst">
              <span>!</span>
            </div>
            <div className="eyebrow">PHONE DOWN • GAME ON</div>
            <h2>Time to play!</h2>
            <p>
              Take turns saying a related word. Play as many rounds as you like,
              then discuss and vote for the imposter.
            </p>
            <div className="vote-note">Trust the clues. Question everyone.</div>
            <button className="primary-button" onClick={startGame}>
              Start a new game <span>↻</span>
            </button>
            <button className="text-button" onClick={returnToSetup}>
              Change number of players
            </button>
          </div>
        )}
      </section>

      <footer>ONE PHONE • ONE SECRET • TRUST NO ONE</footer>

      {showHelp && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowHelp(false)}
        >
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowHelp(false)}
              aria-label="Close instructions"
            >
              ×
            </button>
            <div className="eyebrow">QUICK RULES</div>
            <h2 id="help-title">How to play</h2>
            <ol>
              <li>
                Pass the phone so everyone can check their card privately.
              </li>
              <li>
                Most players see the same word. The imposter sees only a broad
                clue.
              </li>
              <li>
                Put the phone down, then take turns saying one related word.
                Don’t give the answer away!
              </li>
              <li>Play as many rounds as you like, then discuss and vote.</li>
            </ol>
            <button
              className="primary-button"
              onClick={() => setShowHelp(false)}
            >
              Got it!
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
