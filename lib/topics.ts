// Temas guardados: archivos .md o .txt de la carpeta /temas. Solo servidor.
import { promises as fs } from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "temas");
const EXT = /\.(md|txt)$/i;

export interface TopicInfo {
  id: string;
  title: string;
  chars: number;
}

function titleOf(id: string, text: string): string {
  const m = text.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return id.replace(/[-_]+/g, " ").trim();
}

export async function listTopics(): Promise<TopicInfo[]> {
  let files: string[];
  try {
    files = await fs.readdir(DIR);
  } catch {
    return [];
  }
  const out: TopicInfo[] = [];
  for (const f of files.filter((f) => EXT.test(f) && !f.startsWith("_")).sort()) {
    const id = f.replace(EXT, "");
    const text = await fs.readFile(path.join(DIR, f), "utf8");
    if (text.trim().length < 20) continue;
    out.push({ id, title: titleOf(id, text), chars: text.length });
  }
  return out;
}

export async function getTopicText(id: string): Promise<string | null> {
  if (id.startsWith("_") || id.includes("..")) return null;
  if (!/^[\w.\- áéíóúüñÁÉÍÓÚÜÑ]+$/.test(id)) return null;
  for (const ext of [".md", ".txt"]) {
    try {
      return await fs.readFile(path.join(DIR, id + ext), "utf8");
    } catch {
      // probamos la siguiente extensión
    }
  }
  return null;
}
