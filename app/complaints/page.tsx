import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/categories";
import { statusLabel } from "@/lib/cases";

export default async function CasesPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.account !== "citizen") redirect("/login?next=/complaints");

  const cases = await prisma.case.findMany({
    where: {
      OR: [{ userId: session.user.id }, ...(session.user.phone ? [{ reporterPhone: session.user.phone }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">Your cases</h1>
        <Link href="/report" className="border border-moss bg-moss px-4 py-2 text-sm text-paper">
          File a case
        </Link>
      </div>
      {cases.length === 0 ? (
        <p className="mt-6 text-ink/70">
          None on this number yet.{" "}
          <Link href="/report" className="underline">
            File one anonymously or with this number
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border border-line">
          {cases.map((row) => (
            <li key={row.id}>
              <Link href={`/case/${row.caseNumber}`} className="block px-4 py-4 hover:bg-paper-2">
                <p className="font-medium">
                  Case ID {row.caseNumber} · {getCategoryLabel(row.category)}
                </p>
                <p className="text-sm text-ink/70">{row.displayAddress}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-moss">{statusLabel(row.status)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
