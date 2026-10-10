"use client";

import { useState } from "react";
import {
  MAX_PER_TYPE,
  MAX_TOPIC_CHARS,
  MAX_TOTAL,
  TYPE_HINTS,
  TYPE_LABELS,
  TYPE_ORDER,
  type Counts,
  type Question,
  type QuestionType,
} from "@/lib/types";

type Stage = "setup" | "quiz" | "results";

type Resp = {
  choice: number | boolean | null;
  text: string;
  score: number | null; // null = sin comprobar
  feedback: string;
};

const EMPTY: Resp = { choice: null, text: "", score: null, feedback: "" };

const DEFAULT_COUNTS: Counts = { test: 4, vf: 2, short: 2, open: 1 };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function tone(score: number | null): "pending" | "ok" | "partial" | "bad" {
  if (score === null) return "pending";
  if (score >= 0.75) return "ok";
  if (score >= 0.5) return "partial";
  return "bad";
}

function verdict(score: number): string {
  if (score >= 1) return "Correcta";
  if (score >= 0.75) return "Casi correcta";
  if (score >= 0.5) return "Parcialmente correcta";
  return "Incorrecta";
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function describeAnswer(q: Question, r: Resp): string {
  if (q.type === "test") {
    return typeof r.choice === "number" && q.options
      ? q.options[r.choice]
      : "Sin responder";
  }
  if (q.type === "vf") {
    return typeof r.choice === "boolean" ? (r.choice ? "Verdadero" : "Falso") : "Sin responder";
  }
  return r.text.trim() || "Sin responder";
}

function describeSolution(q: Question): string {
  if (q.type === "test") return q.options?.[q.correctIndex ?? 0] ?? "";
  if (q.type === "vf") return q.correctBool ? "Verdadero" : "Falso";
  return q.modelAnswer ?? "";
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("setup");
  const [topic, setTopic] = useState("");
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, Resp>>({});
  const [busy, setBusy] = useState<"" | "generating" | "grading">("");
  const [error, setError] = useState("");

  const total = TYPE_ORDER.reduce((s, t) => s + counts[t], 0);
  const getR = (id: string): Resp => responses[id] ?? EMPTY;

  function patch(id: string, p: Partial<Resp>) {
    setResponses((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...p } }));
  }

  function step(t: QuestionType, delta: number) {
    setCounts((c) => {
      const next = c[t] + delta;
      if (next < 0 || next > MAX_PER_TYPE) return c;
      if (delta > 0 && total >= MAX_TOTAL) return c;
      return { ...c, [t]: next };
    });
  }

  async function generate() {
    if (topic.trim().length < 40) {
      setError("Pega un tema algo más largo (al menos 40 caracteres).");
      return;
    }
    if (total === 0) {
      setError("Elige al menos una pregunta.");
      return;
    }
    setBusy("generating");
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, counts }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(
          (data.error as string) ?? `No se pudieron generar las preguntas (error ${res.status}).`
        );
      }
      setQuestions(data.questions as Question[]);
      setResponses({});
      setIdx(0);
      setStage("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setBusy("");
    }
  }

  async function check(q: Question) {
    const r = getR(q.id);
    setError("");

    if (q.type === "test") {
      if (r.choice === null) return;
      patch(q.id, { score: r.choice === q.correctIndex ? 1 : 0 });
      return;
    }
    if (q.type === "vf") {
      if (r.choice === null) return;
      patch(q.id, { score: r.choice === q.correctBool ? 1 : 0 });
      return;
    }

    if (!r.text.trim()) return;
    setBusy("grading");
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, answer: r.text }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(
          (data.error as string) ?? `No se pudo corregir la respuesta (error ${res.status}).`
        );
      }
      patch(q.id, {
        score: data.score as number,
        feedback: (data.feedback as string) ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setBusy("");
    }
  }

  function next() {
    setError("");
    if (idx < questions.length - 1) setIdx(idx + 1);
    else setStage("results");
  }

  function retryFailed() {
    const failed = questions.filter((q) => (getR(q.id).score ?? 0) < 1);
    if (failed.length === 0) return;
    setQuestions(failed.map((q, i) => ({ ...q, id: `r${i + 1}` })));
    setResponses({});
    setIdx(0);
    setError("");
    setStage("quiz");
  }

  function reset() {
    setStage("setup");
    setQuestions([]);
    setResponses({});
    setIdx(0);
    setError("");
  }

  /* ---------------- Configuración ---------------- */

  if (stage === "setup") {
    return (
      <main className="shell">
        <h1 className="brand">TM10 INS Mollet</h1>
        <p className="lede">
          Pega un tema y practica con preguntas generadas por IA. Siempre verás la solución.
        </p>

        <label className="field-label" htmlFor="topic">
          Tema
        </label>
        <textarea
          id="topic"
          className="topic"
          value={topic}
          maxLength={MAX_TOPIC_CHARS}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Pega aquí los apuntes o el texto que quieres estudiar."
        />
        <div className="meta-row">
          <span>Las preguntas se basan solo en este texto.</span>
          <span>
            {topic.length.toLocaleString("es-ES")} / {MAX_TOPIC_CHARS.toLocaleString("es-ES")}
          </span>
        </div>

        <ul className="counts" aria-label="Número de preguntas por tipo">
          {TYPE_ORDER.map((t) => (
            <li key={t} className="count-row">
              <span className="count-name">
                {TYPE_LABELS[t]}
                <span className="count-hint">{TYPE_HINTS[t]}</span>
              </span>
              <span className="stepper">
                <button
                  type="button"
                  onClick={() => step(t, -1)}
                  disabled={counts[t] === 0}
                  aria-label={`Una pregunta menos de ${TYPE_LABELS[t]}`}
                >
                  −
                </button>
                <output aria-live="polite">{counts[t]}</output>
                <button
                  type="button"
                  onClick={() => step(t, 1)}
                  disabled={counts[t] >= MAX_PER_TYPE || total >= MAX_TOTAL}
                  aria-label={`Una pregunta más de ${TYPE_LABELS[t]}`}
                >
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
        <p className="total-line">
          {total} {total === 1 ? "pregunta" : "preguntas"} en total (máximo {MAX_TOTAL}).
        </p>

        <button className="btn" type="button" onClick={generate} disabled={busy !== ""}>
          {busy === "generating" ? "Generando preguntas…" : "Generar preguntas"}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  }

  /* ---------------- Resultados ---------------- */

  if (stage === "results") {
    const sum = questions.reduce((s, q) => s + (getR(q.id).score ?? 0), 0);
    const pct = Math.round((sum / questions.length) * 100);
    const perfect = questions.filter((q) => (getR(q.id).score ?? 0) >= 1).length;
    const hasFailed = perfect < questions.length;

    return (
      <main className="shell">
        <h1 className="brand">Resultados</h1>
        <p className="score">{pct}%</p>
        <p className="score-sub">
          {perfect} de {questions.length} totalmente correctas.
        </p>

        <ol className="review">
          {questions.map((q, i) => {
            const r = getR(q.id);
            return (
              <li key={q.id}>
                <span className={`dot ${tone(r.score)}`} aria-hidden="true" />
                <div>
                  <p className="r-q">
                    {i + 1}. {q.question}
                  </p>
                  <p className="r-line">
                    <strong>Tu respuesta:</strong> {describeAnswer(q, r)}
                  </p>
                  <p className="r-line">
                    <strong>Solución:</strong> {describeSolution(q)}
                  </p>
                  {r.feedback && (
                    <p className="r-line">
                      <strong>Corrección:</strong> {r.feedback}
                    </p>
                  )}
                  <p className="r-line">{q.explanation}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="actions">
          {hasFailed && (
            <button className="btn" type="button" onClick={retryFailed}>
              Repetir las falladas
            </button>
          )}
          <button className="btn secondary" type="button" onClick={reset}>
            Nuevo tema
          </button>
        </div>
      </main>
    );
  }

  /* ---------------- Cuestionario ---------------- */

  const q = questions[idx];
  const r = getR(q.id);
  const checked = r.score !== null;
  const isText = q.type === "short" || q.type === "open";
  const canCheck = isText ? r.text.trim().length > 0 : r.choice !== null;
  const last = idx === questions.length - 1;

  return (
    <main className="shell">
      <ol className="progress" aria-label="Progreso">
        {questions.map((item, i) => {
          const t = tone(getR(item.id).score);
          return (
            <li
              key={item.id}
              className={`${t === "pending" ? "" : t} ${i === idx ? "current" : ""}`}
              aria-current={i === idx ? "step" : undefined}
            />
          );
        })}
      </ol>

      <p className="q-meta">
        Pregunta {idx + 1} de {questions.length} — {TYPE_LABELS[q.type]}
      </p>
      <h2 className="q-text">{q.question}</h2>

      {q.type === "test" && q.options && (
        <ul className="options">
          {q.options.map((opt, i) => {
            let cls = "option";
            if (checked) {
              if (i === q.correctIndex) cls += " correct";
              else if (i === r.choice) cls += " wrong";
            } else if (i === r.choice) cls += " selected";
            return (
              <li key={i}>
                <button
                  type="button"
                  className={cls}
                  disabled={checked}
                  onClick={() => patch(q.id, { choice: i })}
                >
                  <span className="letter">{LETTERS[i]}</span>
                  <span>{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {q.type === "vf" && (
        <ul className="options vf">
          {[true, false].map((val) => {
            let cls = "option";
            if (checked) {
              if (val === q.correctBool) cls += " correct";
              else if (val === r.choice) cls += " wrong";
            } else if (val === r.choice) cls += " selected";
            return (
              <li key={String(val)}>
                <button
                  type="button"
                  className={cls}
                  disabled={checked}
                  onClick={() => patch(q.id, { choice: val })}
                >
                  <span>{val ? "Verdadero" : "Falso"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isText && (
        <textarea
          className="answer-box"
          rows={q.type === "short" ? 3 : 8}
          value={r.text}
          disabled={checked || busy === "grading"}
          onChange={(e) => patch(q.id, { text: e.target.value })}
          placeholder={
            q.type === "short" ? "Responde en una o dos frases." : "Desarrolla tu respuesta."
          }
          aria-label="Tu respuesta"
        />
      )}

      {checked && r.score !== null && (
        <div className={`solution ${tone(r.score)}`} aria-live="polite">
          <p className="verdict">{verdict(r.score)}</p>
          {r.feedback && <p>{r.feedback}</p>}
          {isText && (
            <p>
              <span className="tag">Respuesta modelo</span>
              {q.modelAnswer}
            </p>
          )}
          <p>
            <span className="tag">Explicación</span>
            {q.explanation}
          </p>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        {!checked ? (
          <button
            className="btn"
            type="button"
            onClick={() => check(q)}
            disabled={!canCheck || busy !== ""}
          >
            {busy === "grading" ? "Corrigiendo…" : "Comprobar"}
          </button>
        ) : (
          <button className="btn" type="button" onClick={next}>
            {last ? "Ver resultados" : "Siguiente pregunta"}
          </button>
        )}
        <button className="btn secondary" type="button" onClick={reset}>
          Salir
        </button>
      </div>
    </main>
  );
}
