# Guess Lab

An iPad-optimised number-guessing playground for exploring algorithms and statistics. A human player can build a persistent results histogram, compare five deterministic strategies, step through guesses, watch a complete game, or run one full experiment per animation frame.

## Run it

From the repository root:

```sh
just dev guess-lab
```

The app is installable and works offline after its first successful load. Human results are stored only in the browser's local storage and can be cleared with **Reset my results**; algorithm results are never persisted.
