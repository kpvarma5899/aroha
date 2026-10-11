import { pressPack, findClusters, type ClusterCase } from "@/lib/press/pack";
import { prisma } from "@/lib/prisma";
import { slaPolicy } from "@/lib/policy";
import { getCategoryLabel } from "@/lib/categories";
import { CopyButton } from "@/components/CopyButton";

export default async function PressPage() {
  const rows = await prisma.case.findMany({
    where: { status: { in: [...slaPolicy.openStatuses, slaPolicy.awaitingStatus] } },
    select: {
      caseNumber: true,
      publicToken: true,
      category: true,
      publicAddress: true,
      displayAddress: true,
      assemblyName: true,
      zoneName: true,
      createdAt: true,
      supportCount: true,
      sensitive: true,
    },
  });
  const open: ClusterCase[] = rows.map((row) => ({
    ...row,
    displayAddress: row.sensitive ? row.publicAddress || "Approximate area" : row.displayAddress,
  }));
  const clusters = findClusters(open);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-4xl">Press packs</h1>
      <p className="mt-3 text-sm text-ink/70">
        Clusters of the same problem in one assembly. Ten or more is marked ready. Reporter phones
        are never included.
      </p>
      {clusters.length === 0 ? <p className="mt-8 text-ink/60">No clusters yet.</p> : null}
      <div className="mt-8 space-y-10">
        {clusters.map((group) => {
          const pack = pressPack(group);
          return (
            <article key={group.key} className="border border-line p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-moss">
                {getCategoryLabel(group.category)} · {group.assemblyName || "Hyderabad"}
                {group.ready ? " · ready" : ""}
              </p>
              <p className="mt-2 text-sm">{group.count} voices · {group.cases.length} cases</p>
              <textarea readOnly value={pack} rows={12} className="mt-4 w-full border border-line bg-paper p-3 font-mono text-xs" />
              <div className="mt-3">
                <CopyButton text={pack} label="Copy press note" />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
