/** Runs the offline six-round kitten quiz. */
const $ = (id) => document.getElementById(id);
const cats = {
  Ginger: "Look for a warm orange coat, like marmalade.",
  Calico: "Look for three distinct patches of white, orange, and black.",
  Tabby: "Look for the dark stripes and an M-shaped marking on the forehead.",
  Siamese: "Its ears, face, and paws are darker than its pale body.",
  Tuxedo: "Its black coat and white bib look like formal clothes.",
  Tortoiseshell: "Black and orange fur mingle in tiny speckles.",
};
const names = Object.keys(cats),
  shuffle = (a) =>
    a
      .map((x) => [Math.random(), x])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
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
function start(first) {
  deck = first ? ["Ginger", ...shuffle(names.slice(1))] : shuffle(names);
  score = index = 0;
  show();
}
/** Render the picture, clue and answer controls. */
function show() {
  best();
  hinted = answered = false;
  let cat = deck[index];
  $("pic").src = cat.toLowerCase() + ".jpg";
  $("pic").classList.remove("pop");
  void $("pic").offsetWidth;
  $("pic").classList.add("pop");
  $("tag").textContent = "🐾  KITTEN " + String(index + 1).padStart(2, "0");
  $("round").textContent = "ROUND " + (index + 1) + " OF 6";
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
    $("feedback").textContent = cats[cat] + " A correct guess earns 1 point.";
    $("clue").hidden = true;
  };
  let choices = shuffle([
    cat,
    ...shuffle(
      names.filter((x) => x !== cat && !(cat === "Ginger" && x === "Tabby")),
    ).slice(0, 3),
  ]);
  choices.forEach((x, i) => {
    let b = document.createElement("button");
    b.innerHTML = "<label>" + String.fromCharCode(65 + i) + "</label>" + x;
    b.onclick = () => {
      if (answered) return;
      answered = true;
      let ok = x === cat,
        p = ok ? (hinted ? 1 : 2) : 0;
      score += p;
      for (const c of $("choices").children) {
        c.disabled = true;
        if (c.textContent.slice(1) === cat) c.classList.add("correct");
      }
      if (ok) burst(b);
      else b.classList.add("wrong");
      tones(ok ? [523, 659, 784] : [392, 330]);
      $("feedback").textContent = ok
        ? "You spotted it! +" + p + (p === 1 ? " point" : " points")
        : "This kitten is " + cat + ". " + cats[cat];
      $("pts").textContent = "✦  " + score + " pts";
      $("clue").hidden = false;
      $("clue").textContent = index === 5 ? "See my score" : "Next kitten";
      $("clue").onclick = () => {
        if (++index < 6) show();
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
  $("clue").onclick = () => start(false);
  tones([523, 659, 784, 1046]);
  burst($("question"));
}
names.forEach((x) => {
  new Image().src = x.toLowerCase() + ".jpg";
});
soundUI();
start(true);
