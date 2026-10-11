import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { RunJobsButton } from "@/components/RunJobsButton";
import { CASE_STATUSES, statusLabel } from "@/lib/cases";
import { getCategoryLabel } from "@/lib/categories";

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string }>;
}) {
  const staff = await requireStaff();
  if (!staff) return null;
  const params = await searchParams;
  const mine = params.mine === "1";
  const status = params.status;

  const cases = await prisma.case.findMany({
    where: {
      ...(mine ? { assignedStaffId: staff.id } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedStaff: { select: { name: true } },
      attachments: { select: { id: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Cases</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/70">
        Anonymous reports land here. Assign someone, file the official ticket, and update the
        status. To close a case, write the close-out and attach proofs — residents cannot post on X.
      </p>
      <div className="mt-4">
        <RunJobsButton />
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/admin" className={!status && !mine ? "border border-moss px-3 py-1" : "border border-line px-3 py-1"}>
          All
        </Link>
        <Link href="/admin?mine=1" className={mine ? "border border-moss px-3 py-1" : "border border-line px-3 py-1"}>
          Assigned to me
        </Link>
        {CASE_STATUSES.map((item) => (
          <Link
            key={item.id}
            href={`/admin?status=${item.id}`}
            className={status === item.id ? "border border-moss px-3 py-1" : "border border-line px-3 py-1"}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink/50">
              <th className="py-2 pr-3">Case ID</th>
              <th className="py-2 pr-3">Problem</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Assigned</th>
              <th className="py-2">Filed</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <td className="py-3 pr-3">
                  <Link href={`/admin/cases/${row.id}`} className="underline">
                    {row.caseNumber}
                  </Link>
                  {row.reporterPhone ? "" : <span className="ml-2 text-xs text-ink/45">anonymous</span>}
                </td>
                <td className="py-3 pr-3">{getCategoryLabel(row.category)}</td>
                <td className="max-w-xs truncate py-3 pr-3">{row.displayAddress}</td>
                <td className="py-3 pr-3">{statusLabel(row.status)}</td>
                <td className="py-3 pr-3">{row.assignedStaff?.name ?? "—"}</td>
                <td className="py-3">{row.createdAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cases.length === 0 ? <p className="mt-8 text-ink/60">No cases in this view yet.</p> : null}
      </div>
    </div>
  );
}
