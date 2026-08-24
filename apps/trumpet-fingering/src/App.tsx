/** Renders and coordinates the Trumpet Fingering game screen. */
import React, { useEffect, useState, useRef } from "react";
import MusicStaff from "./MusicStaff";
import Keyboard from "./Keyboard";
import SelectFingering from "./SelectFingering";
import { useContainerSize } from "./useContainerSize";
import { useGameController } from "./useGameController";
import GameOverModal from "./GameOverModal";

// ============================================================
// LAYOUT CONSTANTS - Easily tweakable percentages
// ============================================================

// Width percentages for the three main components (should sum to ~100)
const LAYOUT = {
  MUSIC_STAFF_WIDTH_PERCENT: 28,
  KEYBOARD_WIDTH_PERCENT: 38,
  SELECT_FINGERING_WIDTH_PERCENT: 34,

  // Heights
  HEADER_HEIGHT: 70,
  FOOTER_HEIGHT: 80,
  COMPONENT_GAP: 16,
  MAIN_PADDING: 16,
};

// ============================================================
// COLOR PALETTE - Bright colors for young girls
// ============================================================

const COLORS = {
  // Gradient background colors
  gradientStart: "#9b59b6", // Purple
  gradientMid: "#e91e63", // Pink
  gradientEnd: "#f39c12", // Orange/Gold

  // UI colors
  headerBg: "rgba(255, 255, 255, 0.15)",
  footerBg: "rgba(255, 255, 255, 0.2)",
  textLight: "#ffffff",
  textDark: "#333333",

  // Highlight colors
  correctGreen: "#4CAF50",
  incorrectRed: "#f44336",

  // Component backgrounds
  componentBg: "rgba(255, 255, 255, 0.95)",
};

// ============================================================
// Helper Components
// ============================================================

interface AnimatedBackgroundProps {
  children: React.ReactNode;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
}) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      setRotation((r) => (r + delta * 0.005) % 360);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: `linear-gradient(${rotation}deg, ${COLORS.gradientStart}, ${COLORS.gradientMid}, ${COLORS.gradientEnd})`,
      }}
    >
      {/* Sunbeam effect */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "200%",
          height: "200%",
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          background: `repeating-conic-gradient(
          from 0deg,
          rgba(255,255,255,0.03) 0deg 10deg,
          transparent 10deg 20deg
        )`,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
};

interface HeaderProps {
  height: number;
}

const Header: React.FC<HeaderProps> = ({ height }) => {
  const [bounce, setBounce] = useState(0);

  useEffect(() => {
    let animationId: number;
    const animate = (time: number) => {
      setBounce(Math.sin(time * 0.002) * 3);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <header
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.headerBg,
        backdropFilter: "blur(10px)",
        borderBottom: "2px solid rgba(255,255,255,0.2)",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 32,
          fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
          color: COLORS.textLight,
          textShadow:
            "2px 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)",
          transform: `translateY(${bounce}px)`,
          letterSpacing: 2,
        }}
      >
        🎺 Trumpet Fingering 🎵
      </h1>
    </header>
  );
};

interface FooterProps {
  height: number;
  totalScore: number;
  rewardMessage: { text: string; type: string } | null;
  celebrationProgress: number;
  showProgress: boolean;
}

const Footer: React.FC<FooterProps> = ({
  height,
  totalScore,
  rewardMessage,
  celebrationProgress,
  showProgress,
}) => {
  const [displayedScore, setDisplayedScore] = useState(totalScore);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate score changes
  useEffect(() => {
    if (totalScore !== displayedScore) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayedScore(totalScore);
        setIsAnimating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [totalScore, displayedScore]);

  return (
    <footer
      style={{
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.footerBg,
        backdropFilter: "blur(10px)",
        borderTop: "2px solid rgba(255,255,255,0.2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Progress bar at the very bottom */}
      {showProgress && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${celebrationProgress}%`,
              background: "linear-gradient(90deg, #4CAF50, #8BC34A)",
              transition: "width 50ms linear",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {rewardMessage ? (
          <div
            style={{
              fontSize: 24,
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              color: COLORS.textLight,
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              animation: "bounceIn 0.5s ease-out",
              textAlign: "center",
            }}
          >
            {rewardMessage.type === "streak" ? "🌟 " : "🏆 "}
            {rewardMessage.text}
            {rewardMessage.type === "streak" ? " 🌟" : " 🏆"}
          </div>
        ) : (
          <div
            style={{
              fontSize: 28,
              fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive',
              color: COLORS.textLight,
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              transform: isAnimating ? "scale(1.2)" : "scale(1)",
              transition: "transform 0.15s ease-out",
            }}
          >
            ⭐ Score: {displayedScore} ⭐
          </div>
        )}
      </div>
    </footer>
  );
};

// ============================================================
// Perfect Round Animations
// ============================================================

type AnimationType = "confetti" | "fireworks" | "stars";

const ANIMATION_COLORS = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#ff9ff3",
  "#54a0ff",
  "#5f27cd",
  "#00d2d3",
  "#ff9f43",
  "#ee5a24",
  "#1dd1a1",
];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: "square" | "circle" | "star";
  animType: AnimationType;
}

const PerfectRoundAnimation: React.FC<{ active: boolean }> = ({ active }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Pick a random animation type each time
    const types: AnimationType[] = ["confetti", "fireworks", "stars"];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    // Generate initial particles based on animation type
    const newParticles: Particle[] = [];
    const count = chosenType === "stars" ? 40 : 50;

    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: i,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color:
          ANIMATION_COLORS[Math.floor(Math.random() * ANIMATION_COLORS.length)],
        size: 0,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: "square",
        animType: chosenType,
      };

      if (chosenType === "confetti") {
        // Confetti falls from top
        particle.x = Math.random() * 100;
        particle.y = -10 - Math.random() * 20;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = 3 + Math.random() * 4;
        particle.size = 8 + Math.random() * 8;
        particle.shape = Math.random() > 0.5 ? "square" : "circle";
      } else if (chosenType === "fireworks") {
        // Fireworks burst from center
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 5 + Math.random() * 8;
        particle.x = 50;
        particle.y = 50;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.size = 6 + Math.random() * 6;
        particle.shape = "circle";
      } else {
        // Shooting stars - start from edges and streak across
        const startFromLeft = Math.random() > 0.5;
        const startFromTop = Math.random() > 0.7;

        if (startFromTop) {
          // Some stars come from the top
          particle.x = Math.random() * 100;
          particle.y = -5;
          particle.vx = (Math.random() - 0.5) * 3;
          particle.vy = 4 + Math.random() * 4;
        } else if (startFromLeft) {
          // Stars from left going right
          particle.x = -5;
          particle.y = Math.random() * 60;
          particle.vx = 6 + Math.random() * 6;
          particle.vy = 2 + Math.random() * 3;
        } else {
          // Stars from right going left
          particle.x = 105;
          particle.y = Math.random() * 60;
          particle.vx = -(6 + Math.random() * 6);
          particle.vy = 2 + Math.random() * 3;
        }

        particle.size = 12 + Math.random() * 12;
        particle.shape = "star";
        particle.color = Math.random() > 0.3 ? "#ffd700" : "#ffffff";
        particle.rotationSpeed = (Math.random() - 0.5) * 15;
      }

      newParticles.push(particle);
    }

    setParticles(newParticles);
    startTimeRef.current = performance.now();

    // Animate particles
    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;

      setParticles((prev) =>
        prev.map((p) => {
          let newX = p.x + p.vx * 0.3;
          let newY = p.y + p.vy * 0.3;
          let newVy = p.vy;
          let newVx = p.vx;

          if (chosenType === "confetti") {
            // Add gravity and wobble
            newVy += 0.1;
            newX += Math.sin(elapsed * 0.01 + p.id) * 0.3;
          } else if (chosenType === "fireworks") {
            // Slow down and add gravity
            newVy += 0.15;
          } else if (chosenType === "stars") {
            // Shooting stars - slight gravity pull downward
            newVy += 0.05;
          }

          return {
            ...p,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            rotation: p.rotation + p.rotationSpeed,
          };
        }),
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => {
        // Calculate trail angle for shooting stars
        const trailAngle =
          p.animType === "stars" && (p.vx !== 0 || p.vy !== 0)
            ? Math.atan2(p.vy, p.vx) * (180 / Math.PI) + 180
            : 0;
        const trailLength =
          p.animType === "stars" ? Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 8 : 0;

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
              background: p.shape === "star" ? "transparent" : p.color,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              boxShadow:
                p.animType === "fireworks"
                  ? `0 0 ${p.size}px ${p.color}`
                  : p.animType === "stars"
                    ? `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}40`
                    : "none",
              opacity: p.y > 100 || p.x < -10 || p.x > 110 ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {p.shape === "star" && (
              <>
                {/* Comet trail */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: trailLength,
                    height: p.size * 0.4,
                    background: `linear-gradient(90deg, ${p.color}00, ${p.color}60, ${p.color})`,
                    transform: `translate(0, -50%) rotate(${trailAngle}deg)`,
                    transformOrigin: "0 50%",
                    borderRadius: p.size * 0.2,
                    filter: "blur(2px)",
                  }}
                />
                {/* Star shape */}
                <svg
                  viewBox="0 0 24 24"
                  width={p.size}
                  height={p.size}
                  fill={p.color}
                  style={{ position: "relative", zIndex: 1 }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Ok Round Animation (simpler sparkle burst)
// ============================================================

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
}

const OK_SPARKLE_COLORS = [
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFEB3B",
  "#FFC107",
];

const OkRoundAnimation: React.FC<{ active: boolean }> = ({ active }) => {
  const [particles, setParticles] = useState<SparkleParticle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Create a simple burst of sparkles from center
    const newParticles: SparkleParticle[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 3 + Math.random() * 4;

      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color:
          OK_SPARKLE_COLORS[
            Math.floor(Math.random() * OK_SPARKLE_COLORS.length)
          ],
        size: 4 + Math.random() * 6,
        opacity: 1,
      });
    }

    setParticles(newParticles);
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;

      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: p.x + p.vx * 0.4,
          y: p.y + p.vy * 0.4,
          vy: p.vy + 0.1, // gravity
          opacity: Math.max(0, 1 - elapsed / 800),
        })),
      );

      if (elapsed < 800) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            transform: "translate(-50%, -50%)",
            background: p.color,
            borderRadius: "50%",
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

// ============================================================
// Component Wrappers with Highlight
// ============================================================

interface ComponentWrapperProps {
  children: React.ReactNode;
  highlight: "none" | "correct" | "incorrect";
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  children,
  highlight,
}) => {
  const borderColor =
    highlight === "correct"
      ? COLORS.correctGreen
      : highlight === "incorrect"
        ? COLORS.incorrectRed
        : "transparent";

  const boxShadow =
    highlight !== "none"
      ? `0 0 20px ${borderColor}, 0 0 40px ${borderColor}40`
      : "0 4px 20px rgba(0,0,0,0.15)";

  return (
    <div
      style={{
        background: COLORS.componentBg,
        borderRadius: 12,
        overflow: "hidden",
        border: `4px solid ${borderColor}`,
        boxShadow,
        transition: "all 0.2s ease-out",
        transform: highlight === "incorrect" ? "scale(0.98)" : "scale(1)",
      }}
    >
      {children}
    </div>
  );
};

// ============================================================
// Main App Component
// ============================================================

const App: React.FC = () => {
  const [gameState, gameActions] = useGameController();

  // Container refs for measuring
  const [staffRef, staffSize] = useContainerSize();
  const [keyboardRef, keyboardSize] = useContainerSize();
  const [fingeringRef, fingeringSize] = useContainerSize();

  // Calculate component dimensions
  const staffDim = Math.min(staffSize.width, staffSize.height);
  const keyboardWidth = keyboardSize.width;
  const keyboardHeight = Math.min(
    keyboardSize.height,
    keyboardSize.width * 0.65,
  );
  const fingeringWidth = fingeringSize.width;
  const fingeringHeight = fingeringSize.height;

  const mainHeight = `calc(100vh - ${LAYOUT.HEADER_HEIGHT + LAYOUT.FOOTER_HEIGHT}px)`;

  return (
    <AnimatedBackground>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "relative",
        }}
      >
        <Header height={LAYOUT.HEADER_HEIGHT} />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: LAYOUT.MAIN_PADDING,
            gap: LAYOUT.COMPONENT_GAP,
            minHeight: mainHeight,
            maxHeight: mainHeight,
          }}
        >
          {/* MusicStaff Container */}
          <div
            ref={staffRef}
            style={{
              flex: `0 0 ${LAYOUT.MUSIC_STAFF_WIDTH_PERCENT}%`,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {staffDim > 0 && gameState.currentTask && (
              <ComponentWrapper highlight="none">
                <MusicStaff
                  note={gameState.currentTask}
                  size={staffDim * 0.9}
                />
              </ComponentWrapper>
            )}
          </div>

          {/* Keyboard Container */}
          <div
            ref={keyboardRef}
            style={{
              flex: `0 0 ${LAYOUT.KEYBOARD_WIDTH_PERCENT}%`,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {keyboardWidth > 0 && (
              <ComponentWrapper highlight={gameState.keyboardHighlight}>
                <Keyboard
                  width={keyboardWidth * 0.95}
                  height={keyboardHeight}
                  version={gameState.keyboardVersion}
                  frozen={gameState.keyboardFrozen}
                  onNoteSelect={gameActions.handleKeyboardSelect}
                />
              </ComponentWrapper>
            )}
          </div>

          {/* SelectFingering Container */}
          <div
            ref={fingeringRef}
            style={{
              flex: `0 0 ${LAYOUT.SELECT_FINGERING_WIDTH_PERCENT}%`,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {fingeringWidth > 0 && fingeringHeight > 0 && (
              <ComponentWrapper highlight={gameState.fingeringHighlight}>
                <SelectFingering
                  width={fingeringWidth * 0.95}
                  height={fingeringHeight * 0.95}
                  advanced={false}
                  version={gameState.fingeringVersion}
                  frozen={gameState.fingeringFrozen}
                  onSelect={gameActions.handleFingeringSelect}
                />
              </ComponentWrapper>
            )}
          </div>
        </main>

        <Footer
          height={LAYOUT.FOOTER_HEIGHT}
          totalScore={gameState.totalScore}
          rewardMessage={gameState.rewardMessage}
          celebrationProgress={gameState.celebrationProgress}
          showProgress={gameState.phase === "celebrating"}
        />

        {/* Perfect round animation */}
        <PerfectRoundAnimation active={gameState.showPerfectAnimation} />

        {/* Ok round animation (simpler sparkle burst) */}
        <OkRoundAnimation active={gameState.showOkAnimation} />

        <GameOverModal
          visible={gameState.phase === "gameover"}
          score={gameState.totalScore}
          endGameHighScore={gameState.endGameHighScore}
          endGameRewardMessage={gameState.endGameRewardMessage}
          roundsCompleted={gameState.roundsCompleted}
          maxRounds={gameState.maxRounds}
          onPlayAgain={gameActions.startNewGame}
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounceIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </AnimatedBackground>
  );
};

export default App;
