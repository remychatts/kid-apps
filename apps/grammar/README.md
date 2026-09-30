# Word Detective

An independently runnable, offline-capable KS2 word-class game with a paper-and-teal
detective desk, clear fonts and a magnifying-glass icon. The app ID remains `grammar`.

Run `npm run dev -- grammar` from the repository root. Run the shared quality checks
with `just ci` (or `npm run ci`), including this app's model and content tests.

## Playing

Two randomly mixed mechanics ask the student to classify a highlighted word or
find any word of a requested class. Practice balances class coverage, gives a
little extra attention to the newest class and revisits weaker first-attempt
results. Incorrect answers give a clue; descriptor links are shown on retries and
after success. Students advance deliberately after reading the feedback.

The cog opens seven cumulative levels, sound and reduced-motion preferences.
Level 2 unlocks nouns and verbs. Raising the level introduces the new classes;
changing the level starts a fresh case and streak. A field guide and session
summary are available from the notebook.

The magnifying glass preserves the case and explains any tapped word, including
locked classes. Help on an unsolved question ends the independent streak and
marks that question as supported practice. Inspecting an already solved case
does not change its reward.

Independent first answers earn one point and increase the streak. Mistakes reset
the streak immediately; a corrected or help-supported answer starts at one and
earns a smaller reward without a point. Every multiple of ten brings a randomly
chosen confetti, fireworks or ribbon celebration with applause. Celebrations are
brief and skippable, and become still badges with reduced motion enabled.

Settings and per-level best streaks are saved under `word-detective:v1` in
localStorage. Records are saved immediately; beating the previous record earns a
celebration when the streak ends. Points, practice statistics and the current
streak belong to the current session. If storage is unavailable, gameplay still
works and the app explains that records cannot be saved.

Fonts, content, icons and audio are bundled locally. The shared service worker
precaches them for offline use; the app makes no dynamic data requests.

## Audio

The three MP3 applause recordings in `public/applause/` are copied unchanged from
`apps/trumpet-practice/public/assets/applause_1/applause/`, as requested. They retain
their existing Mixkit filenames. Small rewards use short synthesised chimes.

`noun-pool.json` preserves the ten original categories and their ten target nouns.
`sentence-pool.json` contains the corresponding 100 sentence entries, with extra
nouns such as moose and snake appearing within those sentences. The categories
are content groupings: feelings and mental states are also abstract nouns.

## Sentence data

- `wordClassOrder` defines the seven cumulative levels; the default is level 2.
- `wordClassGuides` supplies a short introduction and two examples for each class.
- Each entry has a stable `id`, its original target `noun`, `text`, `words` and
  `relationships`. Every unlocked word can be a game target, including additional
  nouns and verbs within an entry.
- Each word has an entry-local `id`, its displayed `word`, its contextual
  `wordClass`, a `hint` that does not reveal the label, and an `explanation` for
  success or help mode. Punctuation is retained in `text`, but is not a word.
- Every adjective and adverb has a relationship. `sourceWordId` identifies the
  describing word. For `scope: "word"`, `targetWordIds` identifies the word it
  describes. For `scope: "clause"`, the target list is empty: the adverb comments
  on the event, rather than pointing to one word. IDs resolve within that entry.

Use the source word's hint after an incorrect answer and its explanation after
success or in help mode. Word relationships support visual connections; clause
relationships need explanatory feedback without a line to a single word.
Ordinary hints and explanations deliberately avoid naming the linked word's
class, which may be beyond the configured level.

Word classes are intentionally broad enough for KS2. Auxiliary verbs such as
`can` and `will` are labelled `verb`; adverb links point to the main verb.
Possessive `my` is a determiner. `silent` in the playground sentence describes
`playground`, despite following the verb.

## Words used in different classes

Eight identical spellings appear as both nouns and verbs: **paint, dream, doubt,
rain, park, nurse, milk and time**. **Fast** appears as an adjective and an adverb.
These examples belong to separate questions and need no special student-facing
announcement. `Friendly` remains an adjective, illustrating that an `-ly` ending
does not by itself identify an adverb.

Child protagonists are girls. All 100 entries retain their target nouns and
contain at least one adjective and at least one adverb. Sentence openings and
adverb positions vary to discourage guessing from word position.
