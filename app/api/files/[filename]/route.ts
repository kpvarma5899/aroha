import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { contentTypeFor, isSafeFilename, UPLOAD_DIR } from "@/lib/uploads";

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const caseRef = searchParams.get("case");
  const staff = await requireStaff();

  const attachment = await prisma.attachment.findFirst({
    where: { storedName: filename },
    include: { case: { select: { publicToken: true, caseNumber: true, id: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const matchesCase = caseRef
    ? [attachment.case.id, attachment.case.caseNumber, attachment.case.publicToken].includes(caseRef)
    : false;
  const allowed =
    Boolean(staff) ||
    matchesCase ||
    (token && token === attachment.case.publicToken);
  if (!allowed) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const data = await readFile(join(UPLOAD_DIR, filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(filename, attachment.mime),
        "Content-Disposition": `inline; filename="${attachment.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
