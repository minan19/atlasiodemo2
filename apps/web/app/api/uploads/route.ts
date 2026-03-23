import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const BASE_DIR = path.join(process.cwd(), ".uploads");

function safeName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function contentTypeFor(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".doc" || ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".xls" || ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function getCategory(req: NextRequest) {
  return req.nextUrl.searchParams.get("category") || "general";
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function GET(req: NextRequest) {
  const category = getCategory(req);
  const name = req.nextUrl.searchParams.get("name");
  const dir = path.join(BASE_DIR, category);
  await ensureDir(dir);

  if (name) {
    const safe = safeName(name);
    const filePath = path.join(dir, safe);
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": contentTypeFor(safe),
        "Content-Disposition": `attachment; filename="${safe}"`,
      },
    });
  }

  const files = await fs.readdir(dir);
  const list = await Promise.all(
    files.map(async (f) => {
      const stat = await fs.stat(path.join(dir, f));
      return {
        name: f,
        size: stat.size,
        type: path.extname(f).replace(".", "").toUpperCase() || "DOSYA",
        url: `/api/uploads?category=${encodeURIComponent(category)}&name=${encodeURIComponent(f)}`,
      };
    })
  );
  return Response.json(list);
}

export async function POST(req: NextRequest) {
  const category = getCategory(req);
  const dir = path.join(BASE_DIR, category);
  await ensureDir(dir);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }
  const safe = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, safe), buffer);
  return Response.json({
    name: safe,
    size: buffer.length,
    type: path.extname(safe).replace(".", "").toUpperCase() || "DOSYA",
    url: `/api/uploads?category=${encodeURIComponent(category)}&name=${encodeURIComponent(safe)}`,
  });
}

export async function DELETE(req: NextRequest) {
  const category = getCategory(req);
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return Response.json({ error: "Dosya adı gerekli." }, { status: 400 });
  }
  const safe = safeName(name);
  const filePath = path.join(BASE_DIR, category, safe);
  await fs.unlink(filePath);
  return Response.json({ ok: true });
}
