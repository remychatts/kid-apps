/** Shared types for Word Detective's checked content and game state. */
export type WordClass =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "determiner"
  | "pronoun"
  | "preposition";
export type Word = {
  id: string;
  word: string;
  wordClass: WordClass;
  hint: string;
  explanation: string;
};
export type Relationship = {
  sourceWordId: string;
  scope: "word" | "clause";
  targetWordIds: string[];
};
export type Entry = {
  id: string;
  noun: string;
  text: string;
  words: Word[];
  relationships: Relationship[];
  category: string;
};
export type Guide = { definition: string; examples: string[] };
export type Settings = {
  level: number;
  sound: boolean;
  reducedMotion: boolean;
};
export type ClassStats = {
  shown: number;
  completed: number;
  firstCorrect: number;
};
export type Stats = Partial<Record<WordClass, ClassStats>>;
export type Question = {
  entry: Entry;
  mode: "identify" | "find";
  wordId: string;
  wordClass: WordClass;
  attempted: boolean;
  usedHelp: boolean;
  completed: boolean;
  answerWordId?: string;
  wrongAnswer?: string;
};
export type Game = {
  settings: Settings;
  bests: Record<string, number>;
  points: number;
  streak: number;
  baseline: number;
  stats: Stats;
  question: Question;
  caseNumber: number;
  endedRecord: number | null;
};
