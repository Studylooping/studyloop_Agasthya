/**
 * Content types — the source-of-truth shape for every piece of educational
 * content StudyLoop publishes. These types are imported by the content
 * modules in `content/` and by the page components that render them.
 *
 * For now, content lives as TypeScript modules (static-first, per
 * ARCHITECTURE.md §1). When the admin console + Supabase ship in Phase 0c,
 * the same shape moves into the DB and these types stay valid — only the
 * loader changes.
 */

export type Difficulty = "easy" | "medium" | "hard";
export type LearningTrackId = "cbse" | "ap" | "sat" | "jee";
export type ItemKind = "mc_single" | "mc_multi" | "numeric" | "symbolic" | "frq";
export type ReviewStatus = "human_review_required" | "ai_reviewed" | "verified";

export interface Course {
  slug: string;            // "calc-ab"
  track: LearningTrackId;  // "ap"
  shortTitle: string;      // "Calc AB"
  title: string;           // "AP Calculus AB"
  examFamily: "AP" | "CBSE" | "SAT" | "JEE";
  audience: string;        // "Classes 11-12"
  frameworkLabel: string;  // "College Board AP framework"
  description: string;
  status: "live" | "soon";
  comingDate?: string;     // for "soon" courses, e.g., "after AP Calc alpha"
  units: Unit[];
}

export interface Unit {
  slug: string;            // "u1-limits"
  unitCode: string;        // "U1"
  title: string;           // "Limits and Continuity"
  description?: string;
  status: "live" | "soon";
  topics: Topic[];
}

export interface Topic {
  topicCode: string;       // "1.6"
  title: string;           // "Determining Limits Using Algebraic Manipulation"
  subtopic?: string;
  items: Item[];
}

/** Discriminated union over all item kinds. Use `kind` to narrow. */
export type Item = McSingleItem | McMultiItem | NumericItem | SymbolicItem | FrqItem;

export interface ItemFigure {
  type: "svg";
  title: string;
  description: string;
  /** Static trusted SVG authored in local content modules. */
  svg: string;
}

interface ItemBase {
  contentId: string;       // "calc-ab.u1.t1-6.mc.001"
  course: string;          // course slug
  unit: string;            // unit slug
  topic: string;           // topic code "1.6"
  difficulty: 1 | 2 | 3 | 4 | 5;
  calculatorAllowed: boolean;
  skillTags: string[];
  commonMisconceptions: string[];
  questionLatex: string;   // LaTeX (without $ delimiters)
  figure?: ItemFigure;
  hintLadder: Hint[];
  reviewStatus: ReviewStatus;
  version: string;         // "0.1.0"
  sourceType: "original_ai_assisted_question" | "tutor_authored" | "verified";
  /** When a teacher mentor signs off, their display name goes here. */
  verifiedBy?: string;
}

export interface McChoice {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;            // can include LaTeX between $...$
  isCorrect: boolean;
  rationaleIfWrong: string | null;
  misconceptionTag: string | null;
}

export interface McSingleItem extends ItemBase {
  kind: "mc_single";
  choices: McChoice[];
  correctLetter: McChoice["letter"];
  workedSolution: SolutionStep[];
}

export interface McMultiItem extends ItemBase {
  kind: "mc_multi";
  choices: McChoice[];
  correctLetters: McChoice["letter"][];
  workedSolution: SolutionStep[];
}

export interface NumericItem extends ItemBase {
  kind: "numeric";
  answer: {
    value: number;
    toleranceAbs?: number;
    toleranceRel?: number;
    unit?: string;
  };
  workedSolution: SolutionStep[];
}

export interface SymbolicItem extends ItemBase {
  kind: "symbolic";
  answer: { canonicalLatex: string; variables: string[] };
  workedSolution: SolutionStep[];
}

export interface FrqItem extends ItemBase {
  kind: "frq";
  responseType?: "vsaq" | "saq" | "laq" | "case" | "frq";
  parts: FrqPart[];
  rubric: FrqRubric;
  commonErrors: string[];
  workedSolution: FrqSolutionPart[];
}

export interface FrqPart {
  letter: string;          // "a", "b", "c"
  promptMarkdown: string;
  points: number;
}

export interface FrqRubric {
  maxPoints: number;
  criteria: { part: string; points: number; description: string }[];
}

export interface FrqSolutionPart {
  part: string;
  explanation: string;     // markdown + inline LaTeX between $...$
}

export interface Hint {
  level: 1 | 2 | 3;
  body: string;            // markdown + inline LaTeX
}

export interface SolutionStep {
  step: number;
  explanation: string;     // plain text + optional LaTeX
  math?: string | null;    // LaTeX expression to render as a block
}
