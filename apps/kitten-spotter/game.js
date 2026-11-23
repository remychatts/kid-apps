/** Runs the offline six-round kitten quiz. */
import { looks } from "./kittens.js";

const $ = (id) => document.getElementById(id);
const roundCount = 6;

/** Return a shuffled copy without altering the portrait catalogue. */
function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
let deck,
  index,
  score,
  hinted,
  answered,
  muted = false,
  ctx;
const read = (k) => {
    try {
      return Number(localStorage.getItem(k)) || 0;
    } catch {
      return 0;
    }
  },
  save = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  day = () => "kitten-best-" + new Date().toLocaleDateString("en-CA");
muted = !!read("kitten-muted");
/** Reflect the saved sound preference. */
function soundUI() {
  $("sound").textContent = muted ? "♩̸" : "♫";
  $("sound").setAttribute(
    "aria-label",
    muted ? "Enable sounds" : "Mute sounds",
  );
}
/** Play a short synthesised melody. */
function tones(notes) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    notes.forEach((n, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        t = ctx.currentTime + i * 0.115;
      o.type = "sine";
      o.frequency.value = n;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t);
      o.stop(t + 0.26);
    });
  } catch {}
}
$("sound").onclick = () => {
  muted = !muted;
  save("kitten-muted", +muted);
  soundUI();
  tones([660]);
};
/** Celebrate with a brief shower of stars and paws. */
function burst(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 15; i++) {
    let s = document.createElement("span");
    s.className = "spark";
    s.textContent = i % 3 ? "✦" : "🐾";
    s.style.cssText =
      "left:" +
      (r.left + r.width / 2) +
      "px;top:" +
      r.top +
      "px;color:" +
      ["#cf9e36", "#619654", "#df8874"][i % 3] +
      ";--x:" +
      (Math.random() * 240 - 120) +
      "px;--y:" +
      (-25 - Math.random() * 140) +
      "px";
    document.body.append(s);
    setTimeout(() => s.remove(), 1100);
  }
}
/** Show the best score for the local date. */
function best() {
  $("best").textContent = "★  Daily best: " + read(day());
}
/** Prepare a fresh six-kitten deck. */
function start() {
  deck = shuffle(looks)
    .slice(0, roundCount)
    .map((look) => ({
      ...look,
      photo: look.photos[Math.floor(Math.random() * look.photos.length)],
    }));
  for (const { photo } of deck.slice(1)) new Image().src = photo;
  score = index = 0;
  show();
}
/** Render the picture, clue and answer controls. */
function show() {
  best();
  hinted = answered = false;
  const { name, photo, clue, distractors } = deck[index];
  $("pic").src = photo;
  $("pic").classList.remove("pop");
  void $("pic").offsetWidth;
  $("pic").classList.add("pop");
  $("tag").textContent = "🐾  KITTEN " + String(index + 1).padStart(2, "0");
  $("round").textContent = "ROUND " + (index + 1) + " OF " + roundCount;
  $("pts").textContent = "✦  " + score + " pts";
  $("trail").innerHTML = deck
    .map((_, i) => '<i class="' + (i <= index ? "on" : "") + '"></i>')
    .join("");
  $("question").textContent = "What kind of kitten is this?";
  $("choices").replaceChildren();
  $("feedback").textContent = "";
  $("clue").hidden = false;
  $("clue").textContent = "☼   Reveal a clue";
  $("clue").onclick = () => {
    hinted = true;
    tones([420, 540]);
    $("feedback").textContent = clue + " A correct guess earns 1 point.";
    $("clue").hidden = true;
  };
  const choices = shuffle([name, ...shuffle(distractors).slice(0, 3)]);
  choices.forEach((x, i) => {
    let b = document.createElement("button");
    b.innerHTML = "<label>" + String.fromCharCode(65 + i) + "</label>" + x;
    b.onclick = () => {
      if (answered) return;
      answered = true;
      let ok = x === name,
        p = ok ? (hinted ? 1 : 2) : 0;
      score += p;
      for (const c of $("choices").children) {
        c.disabled = true;
        if (c.textContent.slice(1) === name) c.classList.add("correct");
      }
      if (ok) burst(b);
      else b.classList.add("wrong");
      tones(ok ? [523, 659, 784] : [392, 330]);
      $("feedback").textContent = ok
        ? "You spotted it! +" + p + (p === 1 ? " point" : " points")
        : "This kitten is " + name + ". " + clue;
      $("pts").textContent = "✦  " + score + " pts";
      $("clue").hidden = false;
      $("clue").textContent =
        index === roundCount - 1 ? "See my score" : "Next kitten";
      $("clue").onclick = () => {
        if (++index < roundCount) show();
        else finish();
      };
      $("clue").focus();
    };
    $("choices").append(b);
  });
}
/** Save the daily record and offer another game. */
function finish() {
  let prev = read(day());
  save(day(), Math.max(prev, score));
  best();
  $("round").textContent = "SIX KITTENS SPOTTED";
  $("question").textContent = "You scored " + score + " out of 12!";
  $("choices").replaceChildren();
  $("feedback").textContent =
    score > prev
      ? "A new daily best!"
      : "Your daily best is " + Math.max(score, prev) + ".";
  $("clue").textContent = "Play again";
  $("clue").onclick = start;
  tones([523, 659, 784, 1046]);
  burst($("question"));
}
soundUI();
start();
