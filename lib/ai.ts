// Llamada a la API de Google Gemini. Solo se usa desde el servidor:
// la clave nunca llega al navegador.

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class AIError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY?.trim();
  if (!key || key.startsWith("PEGA_AQUI")) {
    throw new AIError(
      "Falta la clave: abre .env.local y pega tu GOOGLE_API_KEY. Luego reinicia npm run dev.",
      500
    );
  }
  return key;
}

export const MODELS = {
  generate: () => process.env.GOOGLE_MODEL?.trim() || "gemini-3.8-flash",
  grade: () => process.env.GOOGLE_GRADE_MODEL?.trim() || "gemini-3.5-flash-lite",
};

function explain(status: number, body: string, model: string): string {
  let detail = "";
  try {
    detail = JSON.parse(body)?.error?.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  switch (status) {
    case 400:
      return `Google rechazó la petición (400). ${detail}`;
    case 401:
    case 403:
      return `La clave no es válida o no tiene permiso (${status}). Crea otra en aistudio.google.com/apikey. ${detail}`;
    case 404:
      return `El modelo "${model}" no existe o no está disponible para tu clave (404). Cambia GOOGLE_MODEL / GOOGLE_GRADE_MODEL en las variables de entorno.`;
    case 429:
      return "Has llegado al límite gratuito de peticiones (429). Espera un minuto o usa un modelo Flash-Lite.";
    case 503:
      return "El modelo está saturado ahora mismo (503). Inténtalo de nuevo en unos segundos.";
    default:
      return `Error de Google (${status}). ${detail}`;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CallOptions {
  model: string;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
}

export async function callGemini(opts: CallOptions): Promise<string> {
  const key = getApiKey();
  const url = `${BASE}/${encodeURIComponent(opts.model)}:generateContent`;
  const body = JSON.stringify({
    ...(opts.system && {
      systemInstruction: { parts: [{ text: opts.system }] },
    }),
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json !== false && { responseMimeType: "application/json" }),
    },
  });

  const MAX_TRIES = 3;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
      });
    } catch {
      if (attempt < MAX_TRIES - 1) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      throw new AIError("No se pudo conectar con Google. Revisa tu conexión.", 502);
    }

    if (res.ok) {
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts as
        | { text?: string }[]
        | undefined;
      const text = (parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (!text) {
        const reason = data?.promptFeedback?.blockReason;
        throw new AIError(
          reason
            ? `Google bloqueó el contenido (${reason}). Prueba con otro texto.`
            : "Google devolvió una respuesta vacía. Inténtalo de nuevo.",
          502
        );
      }
      return text;
    }

    const errBody = await res.text();
    if ((res.status === 429 || res.status === 503) && attempt < MAX_TRIES - 1) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    throw new AIError(explain(res.status, errBody, opts.model), res.status);
  }

  throw new AIError("No se obtuvo respuesta de Google.", 502);
}

export function parseJson(text: string): unknown {
  const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new AIError("La IA no devolvió un JSON válido. Inténtalo de nuevo.", 502);
  }
}
