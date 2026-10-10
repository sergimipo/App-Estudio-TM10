export type QuestionType = "test" | "vf" | "short" | "open";

export const TYPE_ORDER: QuestionType[] = ["test", "vf", "short", "open"];

export const TYPE_LABELS: Record<QuestionType, string> = {
  test: "Test",
  vf: "Verdadero o falso",
  short: "Respuesta corta",
  open: "Respuesta abierta",
};

export const TYPE_HINTS: Record<QuestionType, string> = {
  test: "4 opciones, una correcta",
  vf: "Afirmaciones a valorar",
  short: "Una o dos frases",
  open: "Desarrollar con tus palabras",
};

export const MAX_PER_TYPE = 10;
export const MAX_TOTAL = 20;
export const MAX_TOPIC_CHARS = 20000;
export const MAX_ANSWER_CHARS = 4000;
export const MAX_AVOID = 40;
export const MAX_SAVED_CHARS = 60000;

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  explanation: string;
  // test
  options?: string[];
  correctIndex?: number;
  // vf
  correctBool?: boolean;
  // short / open
  modelAnswer?: string;
  keyPoints?: string[];
}

export type Counts = Record<QuestionType, number>;

export interface GradeResult {
  score: number; // 0 a 1
  feedback: string;
}
