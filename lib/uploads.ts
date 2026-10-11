import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

const ALLOWED: Record<string, { ext: string; kind: "image" | "document" }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "document" },
  "text/plain": { ext: "txt", kind: "document" },
  "text/csv": { ext: "csv", kind: "document" },
  "application/msword": { ext: "doc", kind: "document" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    kind: "document",
  },
};

export type StoredFile = {
  storedName: string;
  originalName: string;
  mime: string;
  kind: "image" | "document";
};

const BY_EXT: Record<string, { mime: string; ext: string; kind: "image" | "document" }> = {
  jpg: { mime: "image/jpeg", ext: "jpg", kind: "image" },
  jpeg: { mime: "image/jpeg", ext: "jpg", kind: "image" },
  png: { mime: "image/png", ext: "png", kind: "image" },
  webp: { mime: "image/webp", ext: "webp", kind: "image" },
  gif: { mime: "image/gif", ext: "gif", kind: "image" },
  pdf: { mime: "application/pdf", ext: "pdf", kind: "document" },
  txt: { mime: "text/plain", ext: "txt", kind: "document" },
  csv: { mime: "text/csv", ext: "csv", kind: "document" },
  doc: { mime: "application/msword", ext: "doc", kind: "document" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
    kind: "document",
  },
};

export async function saveUploads(files: File[], limit = 8): Promise<StoredFile[]> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const saved: StoredFile[] = [];
  for (const file of files.slice(0, limit)) {
    if (file.size === 0 || file.size > 10 * 1024 * 1024) continue;
    const extFromName = file.name.split(".").pop()?.toLowerCase() || "";
    const meta = ALLOWED[file.type] ?? (BY_EXT[extFromName] ? { ext: BY_EXT[extFromName].ext, kind: BY_EXT[extFromName].kind } : null);
    if (!meta) continue;
    const mime = ALLOWED[file.type] ? file.type : BY_EXT[extFromName]?.mime || file.type;
    const storedName = `${randomUUID()}.${meta.ext}`;
    await writeFile(join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
    saved.push({
      storedName,
      originalName: file.name || storedName,
      mime,
      kind: meta.kind,
    });
  }
  return saved;
}

export function contentTypeFor(filename: string, mime?: string): string {
  if (mime) return mime;
  const ext = filename.split(".").pop() ?? "";
  const match = Object.entries(ALLOWED).find(([, value]) => value.ext === ext);
  return match?.[0] || "application/octet-stream";
}

export function isSafeFilename(name: string): boolean {
  return /^[\w.-]+$/.test(name) && !name.includes("..");
}
