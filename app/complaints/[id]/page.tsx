import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ComplaintRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/complaints");
  const { id } = await params;
  const record = await prisma.case.findFirst({
    where: {
      OR: [{ id }, { caseNumber: id }],
      AND: [{ OR: [{ userId: session.user.id }, ...(session.user.phone ? [{ reporterPhone: session.user.phone }] : [])] }],
    },
    select: { caseNumber: true },
  });
  if (!record) notFound();
  redirect(`/case/${record.caseNumber}`);
}
