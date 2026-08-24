/** Displays the finished-game score and restart control. */
import React from "react";

interface GameOverModalProps {
  visible: boolean;
  score: number;
  endGameHighScore: number;
  endGameRewardMessage: string | null;
  roundsCompleted: number;
  maxRounds: number;
  onPlayAgain: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  score,
  endGameHighScore,
  endGameRewardMessage,
  roundsCompleted,
  maxRounds,
  onPlayAgain,
}) => {
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 12, 20, 0.55)",
        backdropFilter: "blur(6px)",
        zIndex: 3000,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(680px, 90vw)",
          padding: "36px 40px",
          borderRadius: 28,
          background: "linear-gradient(135deg, #fff8f1, #fef0ff 40%, #f1f7ff)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          overflow: "hidden",
          animation: "modalPop 0.6s ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -120,
            background:
              "conic-gradient(from 120deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b)",
            animation: "rainbowSpin 12s linear infinite",
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: 22,
            border: "2px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "0 0 30px rgba(255, 200, 255, 0.6)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div
            style={{
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              fontSize: 40,
              color: "#2d1b4e",
              textShadow: "0 2px 8px rgba(255, 149, 234, 0.5)",
              marginBottom: 8,
            }}
          >
            Game Over!
          </div>
          <div
            style={{
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              fontSize: 26,
              color: "#3b2a5e",
              marginBottom: 18,
              animation: "scorePulse 1.6s ease-in-out infinite",
            }}
          >
            Final Score: <strong style={{ color: "#e91e63" }}>{score}</strong>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#4b3a66",
              marginBottom: 18,
            }}
          >
            Rounds: {roundsCompleted} / {maxRounds}
          </div>
          {endGameRewardMessage && (
            <div
              style={{
                margin: "18px auto 8px",
                padding: "12px 18px",
                borderRadius: 16,
                display: "inline-block",
                background: "linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb)",
                color: "#ffffff",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
                fontSize: 20,
                boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                animation: "rewardGlow 1.2s ease-in-out infinite",
              }}
            >
              {endGameRewardMessage}
            </div>
          )}
          <div
            style={{
              marginTop: 10,
              fontSize: 16,
              color: "#5a4d77",
            }}
          >
            Best Game: {endGameHighScore}
          </div>
          <button
            onClick={onPlayAgain}
            style={{
              marginTop: 26,
              padding: "14px 30px",
              fontSize: 20,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              color: "#ffffff",
              background: "linear-gradient(120deg, #7b2ff7, #f107a3)",
              boxShadow: "0 12px 24px rgba(123, 47, 247, 0.35)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow =
                "0 16px 28px rgba(123, 47, 247, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow =
                "0 12px 24px rgba(123, 47, 247, 0.35)";
            }}
          >
            Play Again
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalPop {
          0% {
            transform: translateY(20px) scale(0.92);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes rainbowSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scorePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes rewardGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
};

export default GameOverModal;
