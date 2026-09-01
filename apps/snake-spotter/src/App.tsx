/** Main Snake Spotter game flow, feedback, score history and controls. */
import { useEffect, useMemo, useState } from "react";
import { createQuiz, rankScores } from "./game";
import type { QuizRound, ScoreEntry } from "./game";
import { playSound } from "./audio";
import "./styles.css";

const SCORE_KEY = "snake-spotter-scores-v1";
const MUTED_KEY = "snake-spotter-muted-v1";

type GameState = "home" | "playing" | "finished";

/** Reads a small JSON value safely from local storage. */
function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Formats a saved ISO date in the player's locale. */
function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

/** Displays a reusable high-score table. */
function HighScores({ scores }: { scores: ScoreEntry[] }) {
  return (
    <section className="score-card" aria-labelledby="high-scores-title">
      <div className="section-heading">
        <span aria-hidden="true">🏆</span>
        <h2 id="high-scores-title">High scores</h2>
      </div>
      {scores.length === 0 ? (
        <p className="empty-score">
          Your greatest expeditions will appear here.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Points</th>
              <th scope="col">Snakes</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr key={score.id}>
                <td>{index + 1}</td>
                <td>
                  <strong>{score.points}</strong>/20
                </td>
                <td>{score.correct}/10</td>
                <td>{formatDate(score.playedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Renders the two-part species fact sheet. */
function FactSheet({ round }: { round: QuizRound }) {
  const { snake } = round;
  return (
    <aside className="fact-sheet" aria-label={`Facts about ${snake.name}`}>
      <div className="fact-stats">
        <div>
          <span aria-hidden="true">📏</span>
          <small>Average length</small>
          <strong>{snake.averageLength}</strong>
        </div>
        <div>
          <span aria-hidden="true">🌍</span>
          <small>Native range</small>
          <strong>{snake.geography}</strong>
        </div>
      </div>
      <ul>
        {snake.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </aside>
  );
}

/** Runs the complete ten-question game. */
export default function App() {
  const [gameState, setGameState] = useState<GameState>("home");
  const [quiz, setQuiz] = useState<QuizRound[]>(() => createQuiz());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [factsRevealed, setFactsRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>(() =>
    readStorage(SCORE_KEY, []),
  );
  const [muted, setMuted] = useState(() => readStorage(MUTED_KEY, false));
  const [imageReady, setImageReady] = useState(false);

  const round = quiz[questionIndex];
  const answered = selected !== null;
  const wasCorrect = selected === round?.snake.name;
  const possiblePoints = factsRevealed ? 1 : 2;
  const progress = gameState === "finished" ? 10 : questionIndex;

  const resultMessage = useMemo(() => {
    if (correct === 10) return "Perfect shed! You identified every snake.";
    if (correct >= 8) return "Super spotter! Your snake eyes are sharp.";
    if (correct >= 5) return "Great expedition! Your skills are growing.";
    return "Brave exploring! Every expert starts with a first trail.";
  }, [correct]);

  useEffect(() => {
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
  }, [muted]);

  /** Starts a fresh, randomly ordered expedition. */
  const startGame = () => {
    playSound("tap", muted);
    window.scrollTo({ top: 0, behavior: "auto" });
    setQuiz(createQuiz());
    setQuestionIndex(0);
    setPoints(0);
    setCorrect(0);
    setFactsRevealed(false);
    setSelected(null);
    setAwardedPoints(0);
    setImageReady(false);
    setGameState("playing");
  };

  /** Trades one available point for the clue-filled fact sheet. */
  const revealFacts = () => {
    playSound("reveal", muted);
    setFactsRevealed(true);
  };

  /** Locks an answer and awards either one or two points when correct. */
  const chooseAnswer = (answer: string) => {
    if (answered) return;
    const answerIsCorrect = answer === round.snake.name;
    setSelected(answer);
    setFactsRevealed(true);
    setAwardedPoints(answerIsCorrect ? possiblePoints : 0);
    if (answerIsCorrect) {
      setPoints((value) => value + possiblePoints);
      setCorrect((value) => value + 1);
      playSound("correct", muted);
    } else {
      playSound("wrong", muted);
    }
  };

  /** Advances to the next image or records a completed expedition. */
  const nextQuestion = () => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (questionIndex < 9) {
      playSound("tap", muted);
      setQuestionIndex((value) => value + 1);
      setSelected(null);
      setFactsRevealed(false);
      setAwardedPoints(0);
      setImageReady(false);
      return;
    }

    const finalPoints = points;
    const finalCorrect = correct;
    const entry: ScoreEntry = {
      id: `${Date.now()}-${Math.random()}`,
      points: finalPoints,
      correct: finalCorrect,
      playedAt: new Date().toISOString(),
    };
    const nextScores = rankScores([...scores, entry]);
    setScores(nextScores);
    localStorage.setItem(SCORE_KEY, JSON.stringify(nextScores));
    setGameState("finished");
    playSound("finish", muted);
  };

  return (
    <div className={`app-shell state-${gameState}`}>
      <div className="background-bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <header className="topbar">
        <a className="home-link" href="../" aria-label="Back to Kid Apps">
          ‹ <span>Kid Apps</span>
        </a>
        <div className="mini-brand" aria-label="Snake Spotter">
          <span className="mini-snake" aria-hidden="true">
            🐍
          </span>
          <strong>Snake Spotter</strong>
        </div>
        <button
          className="sound-button"
          type="button"
          aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
          aria-pressed={muted}
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      {gameState === "home" && (
        <main className="home-screen">
          <section className="hero-card">
            <div className="hero-orbit" aria-hidden="true">
              <span className="snake-emoji">🐍</span>
              <span className="sparkle sparkle-one">✦</span>
              <span className="sparkle sparkle-two">✦</span>
              <span className="leaf">🌿</span>
            </div>
            <p className="eyebrow">WELCOME, WILDLIFE EXPLORER!</p>
            <h1>
              Snake <span>Spotter</span>
            </h1>
            <p className="hero-copy">
              Can you identify ten amazing snakes from their photos?
            </p>
            <div className="rules">
              <div>
                <strong>+2</strong>
                <span>Spot it from the photo</span>
              </div>
              <div>
                <strong>+1</strong>
                <span>Reveal facts, then spot it</span>
              </div>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={startGame}
            >
              Start expedition <span aria-hidden="true">→</span>
            </button>
            <p className="collection-note">
              20 photo species · 100 possible answers
            </p>
          </section>
          <HighScores scores={scores} />
        </main>
      )}

      {gameState === "playing" && round && (
        <main className="game-screen">
          <div className="progress-row">
            <span>Snake {questionIndex + 1} of 10</span>
            <div
              className="progress-track"
              aria-label={`${progress} of 10 complete`}
            >
              <span style={{ width: `${progress * 10}%` }} />
            </div>
            <span className="live-score">⭐ {points} pts</span>
          </div>

          <section className="quiz-card">
            <div className="photo-column">
              <div className={`photo-frame ${imageReady ? "is-ready" : ""}`}>
                <div className="photo-loader" aria-hidden="true">
                  🐍
                </div>
                <img
                  key={round.snake.id}
                  src={round.snake.image}
                  alt="Mystery snake to identify"
                  onLoad={() => setImageReady(true)}
                />
                <span className="photo-badge">
                  {answered
                    ? "IDENTIFIED"
                    : factsRevealed
                      ? "+1 POINT"
                      : "+2 POINTS"}
                </span>
              </div>

              {factsRevealed ? (
                <FactSheet round={round} />
              ) : (
                <button
                  className="reveal-button"
                  type="button"
                  onClick={revealFacts}
                >
                  <span aria-hidden="true">🔎</span>
                  Reveal facts for a clue
                  <small>Correct answer becomes worth 1 point</small>
                </button>
              )}
            </div>

            <div className="question-column">
              <div className="question-heading">
                <p>{answered ? "THE VERDICT" : "WHO AM I?"}</p>
                <h2>
                  {answered
                    ? wasCorrect
                      ? "Brilliant spotting!"
                      : "Slippery one!"
                    : "Choose this snake’s species"}
                </h2>
                {answered && (
                  <div
                    className={`verdict ${wasCorrect ? "correct" : "wrong"}`}
                    role="status"
                  >
                    <span aria-hidden="true">{wasCorrect ? "🎉" : "👀"}</span>
                    <div>
                      <strong>{round.snake.name}</strong>
                      <em>{round.snake.scientificName}</em>
                    </div>
                    <b>+{awardedPoints}</b>
                  </div>
                )}
              </div>

              <div className="answers" aria-label="Answer choices">
                {round.options.map((option, index) => {
                  const isRightAnswer = option === round.snake.name;
                  const isChosenWrong = option === selected && !isRightAnswer;
                  return (
                    <button
                      className={`${answered && isRightAnswer ? "answer-correct" : ""} ${isChosenWrong ? "answer-wrong" : ""}`}
                      type="button"
                      key={option}
                      disabled={answered}
                      onClick={() => chooseAnswer(option)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      <strong>{option}</strong>
                      {answered && isRightAnswer && (
                        <b aria-label="Correct">✓</b>
                      )}
                      {isChosenWrong && <b aria-label="Incorrect">×</b>}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <button
                  className="next-button"
                  type="button"
                  onClick={nextQuestion}
                  autoFocus
                >
                  {questionIndex === 9
                    ? "See expedition results"
                    : "Next snake"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </section>
        </main>
      )}

      {gameState === "finished" && (
        <main className="results-screen">
          <section className="results-card">
            <div className="result-medal" aria-hidden="true">
              🏅
            </div>
            <p className="eyebrow">EXPEDITION COMPLETE</p>
            <h1>{resultMessage}</h1>
            <div className="big-score">
              <span>{points}</span>
              <small>/20 points</small>
            </div>
            <div className="accuracy-pill">
              🐍 {correct} out of 10 snakes identified
            </div>
            <p>
              Photo-only answers earn double points. Can you beat this score on
              the next trail?
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={startGame}
            >
              Explore again <span aria-hidden="true">↻</span>
            </button>
          </section>
          <HighScores scores={scores} />
        </main>
      )}
    </div>
  );
}
