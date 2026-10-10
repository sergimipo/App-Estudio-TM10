import { shuffle } from "./validate";

// Divide el texto en trozos de ~700 caracteres respetando párrafos y frases.
export function splitChunks(text: string, target = 700): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  for (const p of paras) {
    if (p.length > target * 1.5) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      const sentences = p.match(/[^.!?\n]+[.!?]*\s*/g) ?? [p];
      let s = "";
      for (const sen of sentences) {
        if ((s + sen).length > target && s) {
          chunks.push(s.trim());
          s = sen;
        } else {
          s += sen;
        }
      }
      if (s.trim()) chunks.push(s.trim());
    } else if (buf && (buf + "\n" + p).length > target) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + "\n" + p : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.filter((c) => c.length >= 30);
}

const ANGLES = [
  "definición o concepto",
  "causa y consecuencia",
  "ejemplo o caso práctico",
  "comparación o diferencia entre dos ideas",
  "excepción, límite o condición",
  "procedimiento, orden o pasos",
  "dato concreto (cifra, fecha, nombre)",
  "aplicación a una situación nueva",
];

const oneLine = (t: string, max = 160) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
};

// Elige al azar zonas del texto y un enfoque distinto para cada pregunta,
// de modo que cada tanda cubra partes distintas y en orden aleatorio.
export function pickFocus(text: string, n: number): string[] {
  const chunks = splitChunks(text);
  if (chunks.length === 0 || n < 1) return [];
  const order = shuffle(chunks.map((_, i) => i));
  const angles = shuffle(ANGLES);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const chunk = chunks[order[i % order.length]];
    const angle = angles[i % angles.length];
    out.push(`Foco ${i + 1}: «${oneLine(chunk)}» — enfoque: ${angle}`);
  }
  return out;
}
