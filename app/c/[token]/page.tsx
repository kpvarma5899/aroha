import { notFound, redirect } from "next/navigation";
import { findCaseByRef } from "@/lib/case-lookup";
import { casePath } from "@/lib/cases";

export default async function LegacyPublicCasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await findCaseByRef(token);
  if (!record) notFound();
  redirect(casePath(record.caseNumber));
}
