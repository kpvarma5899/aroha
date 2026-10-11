import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildScoreboard } from "@/lib/scoreboard";
import { findClusters } from "@/lib/press/pack";
import { getCategoryLabel } from "@/lib/categories";
import { slaPolicy, privacyPolicy } from "@/lib/policy";
import { getLocale } from "@/lib/i18n-server";
import { interpolate, messagesFor } from "@/lib/i18n";

export default async function ScoreboardPage() {
  const locale = await getLocale();
  const copy = messagesFor(locale);
  const rows = await prisma.case.findMany({
    select: {
      caseNumber: true,
      publicToken: true,
      category: true,
      status: true,
      publicAddress: true,
      displayAddress: true,
      assemblyName: true,
      zoneName: true,
      createdAt: true,
      supportCount: true,
      sensitive: true,
    },
  });
  const board = buildScoreboard(rows);
  const open = rows
    .filter((row) => slaPolicy.openStatuses.includes(row.status) || row.status === slaPolicy.awaitingStatus)
    .map((row) => ({
      caseNumber: row.caseNumber,
      publicToken: row.publicToken,
      category: row.category,
      displayAddress: row.sensitive ? row.publicAddress || "Approximate area" : row.displayAddress,
      assemblyName: row.assemblyName,
      zoneName: row.zoneName,
      createdAt: row.createdAt,
      supportCount: row.supportCount,
    }));
  const clusters = findClusters(open);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">{copy.board.kicker}</p>
      <h1 className="mt-2 font-serif text-4xl">{copy.board.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink/70">{copy.board.lead}</p>
      {board.totalOpen < privacyPolicy.scoreboardThinCount ? (
        <p className="mt-4 text-sm text-ink/60">{interpolate(copy.board.thin, { n: privacyPolicy.scoreboardThinCount })}</p>
      ) : null}
      <p className="mt-4 text-sm">
        <a href="/api/public/data" className="underline">
          {copy.board.csv}
        </a>
      </p>

      <h2 className="mt-10 font-serif text-2xl">{copy.board.assembly}</h2>
      <ScoreTable copy={copy} rows={board.assemblies} />
      <h2 className="mt-10 font-serif text-2xl">{copy.board.zone}</h2>
      <ScoreTable copy={copy} rows={board.zones} />
      <h2 className="mt-10 font-serif text-2xl">{copy.board.agency}</h2>
      <ScoreTable
        copy={copy}
        rows={board.categories.map((row) => ({ ...row, name: getCategoryLabel(row.name, locale) }))}
      />

      {clusters.length ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">{copy.board.press}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {clusters.map((group) => (
              <li key={group.key}>
                {getCategoryLabel(group.category, locale)} · {group.assemblyName || "Hyderabad"} · {group.count} voices
                {group.ready ? " · ready for press" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ScoreTable({
  copy,
  rows,
}: {
  copy: ReturnType<typeof messagesFor>;
  rows: { name: string; open: number; medianDays: number }[];
}) {
  if (!rows.length) return <p className="mt-3 text-sm text-ink/60">—</p>;
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-ink/50">
          <th className="py-2 pr-3">Name</th>
          <th className="py-2 pr-3">{copy.board.open}</th>
          <th className="py-2">{copy.board.median}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-b border-line">
            <td className="py-2 pr-3">{row.name}</td>
            <td className="py-2 pr-3">{row.open}</td>
            <td className="py-2">{row.medianDays}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
