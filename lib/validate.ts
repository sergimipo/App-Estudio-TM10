import type { Question, QuestionType } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// Comprueba lo que devuelve la IA, descarta preguntas mal formadas
// y baraja las opciones de las preguntas tipo test.
export function validateQuestions(raw: unknown): Question[] {
  const list = Array.isArray(raw)
    ? raw
    : (raw as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return [];

  const out: Question[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const type = r.type as QuestionType;
    const question = str(r.question);
    const explanation = str(r.explanation);
    if (!question || !explanation) continue;

    const base = { id: "", question, explanation };

    if (type === "test") {
      const options = Array.isArray(r.options) ? r.options.map(str).filter(Boolean) : [];
      const ci = Number(r.correctIndex);
      if (options.length < 3 || new Set(options).size !== options.length) continue;
      if (!Number.isInteger(ci) || ci < 0 || ci >= options.length) continue;
      const correct = options[ci];
      const shuffled = shuffle(options);
      out.push({ ...base, type, options: shuffled, correctIndex: shuffled.indexOf(correct) });
    } else if (type === "vf") {
      if (typeof r.correctBool !== "boolean") continue;
      out.push({ ...base, type, correctBool: r.correctBool });
    } else if (type === "short" || type === "open") {
      const modelAnswer = str(r.modelAnswer);
      if (!modelAnswer) continue;
      const keyPoints = Array.isArray(r.keyPoints) ? r.keyPoints.map(str).filter(Boolean) : [];
      out.push({ ...base, type, modelAnswer, keyPoints });
    }
  }

  return out.map((q, i) => ({ ...q, id: `q${i + 1}` }));
}
