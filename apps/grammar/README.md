# Grammar sentence data

This directory contains reviewed content for a future KS2 word-class game. It
does not yet contain a runnable app. The working directory name is `grammar`;
the public app name and icon have not been chosen.

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
