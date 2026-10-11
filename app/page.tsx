import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { casePath, closeOutcomeLabel, daysOpen, isClosedStatus } from "@/lib/cases";
import { getCivicHeadlines } from "@/lib/civic-news";
import { getLocale } from "@/lib/i18n-server";
import { messagesFor } from "@/lib/i18n";
import { ticketPolicy } from "@/lib/policy";
import { NewsTicker } from "@/components/NewsTicker";

function publicListStatus(status: string, labels: Record<string, string>): string {
  if (isClosedStatus(status)) return labels.closed;
  if (status === "awaiting_confirmation") return labels.awaiting_confirmation;
  return labels.open;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const locale = await getLocale();
  const copy = messagesFor(locale);
  const params = await searchParams;
  const view = params.view === "open" || params.view === "closed" ? params.view : "all";
  const q = String(params.q || "").trim();
  const headlines = await getCivicHeadlines();

  const rows = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      caseNumber: true,
      category: true,
      status: true,
      displayAddress: true,
      publicAddress: true,
      sensitive: true,
      supportCount: true,
      createdAt: true,
      closeOutcome: true,
      closeSummary: true,
      closedAt: true,
      attachments: { where: { purpose: "after" }, select: { id: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const closed = isClosedStatus(row.status);
    if (view === "open" && closed) return false;
    if (view === "closed" && !closed) return false;
    if (!q) return true;
    const hay = `${row.caseNumber} ${row.category} ${getCategoryLabel(row.category, locale)} ${row.displayAddress} ${row.publicAddress} ${row.closeSummary}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const openCount = rows.filter((row) => !isClosedStatus(row.status)).length;
  const closedCount = rows.length - openCount;
  const voiceCount = rows.reduce((sum, row) => sum + Math.max(1, row.supportCount), 0);

  const civic = ticketPolicy.agencies.find((agency) => agency.key === "mycure");
  const water = ticketPolicy.agencies.find((agency) => agency.key === "hmwssb");
  const power = ticketPolicy.agencies.find((agency) => agency.key === "tgspdcl");

  const how = [
    { title: copy.home.how1Title, body: copy.home.how1 },
    { title: copy.home.how2Title, body: copy.home.how2 },
    { title: copy.home.how3Title, body: copy.home.how3 },
  ];

  const channels = [
    {
      title: copy.home.channelCivic,
      how: copy.home.channelCivicHow,
      href: civic?.portalUrl,
    },
    {
      title: copy.home.channelWater,
      how: copy.home.channelWaterHow,
      href: water?.portalUrl,
    },
    {
      title: copy.home.channelPower,
      how: copy.home.channelPowerHow,
      href: power?.portalUrl,
    },
  ];

  return (
    <div>
      <NewsTicker items={headlines} kicker={copy.home.ticker} />
      <section className="border-b border-line bg-moss-2 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-xs uppercase tracking-[0.22em] text-paper/60">{copy.home.kicker}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{copy.home.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/80">{copy.home.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/report" className="inline-block border border-paper bg-paper px-5 py-2.5 text-moss">
              {copy.home.cta}
            </Link>
            <Link href="/login" className="inline-block border border-paper/40 px-5 py-2.5 text-paper">
              {copy.home.track}
            </Link>
            <Link href="/map" className="inline-block border border-paper/40 px-5 py-2.5 text-paper">
              {copy.home.map}
            </Link>
            <Link href="/scoreboard" className="inline-block border border-paper/40 px-5 py-2.5 text-paper">
              {copy.home.board}
            </Link>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-paper/55">{copy.home.openStat}</dt>
              <dd className="mt-1 font-serif text-3xl">{openCount}</dd>
            </div>
            <div>
              <dt className="text-paper/55">{copy.home.closedStat}</dt>
              <dd className="mt-1 font-serif text-3xl">{closedCount}</dd>
            </div>
            <div>
              <dt className="text-paper/55">{copy.home.voicesStat}</dt>
              <dd className="mt-1 font-serif text-3xl">{voiceCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-serif text-2xl">{copy.home.howTitle}</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {how.map((step, index) => (
              <li key={step.title}>
                <p className="text-xs uppercase tracking-[0.16em] text-moss">{index + 1}</p>
                <h3 className="mt-2 font-serif text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-serif text-2xl">{copy.home.categoriesTitle}</h2>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/report?category=${category.id}`}
                  className="block border border-line bg-paper px-4 py-3 text-sm hover:border-moss"
                >
                  {getCategoryLabel(category.id, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-serif text-2xl">{copy.home.channelsTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">{copy.home.channelsLead}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {channels.map((channel) => (
              <li key={channel.title} className="border border-line p-4">
                <p className="text-sm font-medium">{channel.title}</p>
                <p className="mt-2 text-sm text-ink/70">{channel.how}</p>
                {channel.href ? (
                  <a href={channel.href} className="mt-3 inline-block text-sm underline" target="_blank" rel="noreferrer">
                    {new URL(channel.href).hostname.replace(/^www\./, "")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-serif text-2xl">{copy.home.recentTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/70">{copy.dashboard.lead}</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <FilterLink href="/" active={view === "all"} label={`${copy.dashboard.all} (${rows.length})`} />
            <FilterLink href="/?view=open" active={view === "open"} label={`${copy.dashboard.open} (${openCount})`} />
            <FilterLink
              href="/?view=closed"
              active={view === "closed"}
              label={`${copy.dashboard.closed} (${closedCount})`}
            />
          </div>
          <form className="flex gap-2">
            {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
            <input
              name="q"
              defaultValue={q}
              placeholder={copy.dashboard.searchPlaceholder}
              className="w-64 border border-line bg-paper px-3 py-2 text-sm"
            />
            <button type="submit" className="border border-line px-3 py-2 text-sm">
              {copy.dashboard.search}
            </button>
          </form>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-10 text-ink/60">{copy.dashboard.empty}</p>
        ) : (
          <ul className="mt-8 divide-y divide-line border border-line">
            {filtered.map((row) => {
              const closed = isClosedStatus(row.status);
              const address = row.sensitive ? row.publicAddress || copy.track.hiddenPin : row.displayAddress;
              return (
                <li key={row.id}>
                  <Link href={casePath(row.caseNumber)} className="block px-4 py-4 hover:bg-paper-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{getCategoryLabel(row.category, locale)}</p>
                      <p className="text-xs uppercase tracking-wider text-moss">
                        {publicListStatus(row.status, copy.status)}
                        {!closed ? ` · ${daysOpen(row.createdAt)}d` : ""}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-ink/70">{address}</p>
                    {closed && row.closeSummary ? (
                      <div className="mt-3 text-sm text-ink/80">
                        <p>
                          <span className="text-ink/50">{copy.dashboard.how}: </span>
                          {closeOutcomeLabel(row.closeOutcome, copy.outcomes)}
                        </p>
                        <p className="mt-1 line-clamp-3">{row.closeSummary}</p>
                        {row.attachments.length ? (
                          <p className="mt-1 text-xs text-moss">
                            {copy.dashboard.proofs}: {row.attachments.length}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-ink/50">
                        {copy.dashboard.filed} {row.createdAt.toLocaleDateString("en-IN")}
                        {row.supportCount > 1 ? ` · ${row.supportCount} ${copy.dashboard.voices}` : ""}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={active ? "border border-moss px-3 py-1" : "border border-line px-3 py-1"}>
      {label}
    </Link>
  );
}
