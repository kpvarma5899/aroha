import { unstable_cache } from "next/cache";
import { getCategoryLabel } from "./categories";
import { casePath, daysOpen, isClosedStatus } from "./cases";
import { skipBroadcast, slaPolicy } from "./policy";
import { prisma } from "./prisma";

export type CivicHeadline = {
  id: string;
  title: string;
  href: string;
  source: string;
  kind: "press" | "case";
  external: boolean;
};

const FEEDS: { source: string; url: string }[] = [
  { source: "The Hindu", url: "https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss" },
  { source: "Telangana Today", url: "https://telanganatoday.com/tag/greater-hyderabad-municipal-corporation/feed" },
  { source: "Telangana Today", url: "https://telanganatoday.com/feed" },
];

const INCLUDE =
  /\b(ghmc|hmwssb|tgspdcl|hmda|cyberabad municipal|malkajgiri municipal|civic|municipal|pothole|footpath|garbage|sanitation|sewage|sewer|drain|nala|flood|inundat|storm[- ]water|street ?light|water supply|tanker|pipeline|manhole|encroach|dumping|landfill|waste|fogging|monsoon drive|flyover|road repair|road work|metro|tsrtc|traffic diversion|zonal|commissioner|rti|accountability|power cut|outage|electricity|illegal construction|building permission|layout|lake|desilt|catch pit|rainwater|rwh)\b/i;

const PLACE =
  /\b(hyderabad|secunderabad|ghmc|cyberabad|malkajgiri|kukatpally|banjara|jubilee hills|madhapur|gachibowli|hitec|lb nagar|uppal|serilingampally|alwal|quthbullapur|tellapur|kompally|hitech city|outer ring road|orr|charminar|old city|ameerpet|begumpet|somajiguda|punjagutta|tolichowki|mehdipatnam|kondapur|miyapur|bachupally|shamshabad)\b/i;

const EXCLUDE =
  /\b(movie|film|tollywood|bollywood|actor|actress|review|cafe|restaurant|karaoke|fashion|celebrity|wedding|affair|gossip|ipl|cricket|football|sensex|horoscope|astrology|pet insurance|murder|rape|killed|blast|narcotic|traffick)\b/i;

function stripXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string): { title: string; link: string }[] {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const block = match[0];
      const title = stripXml((block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
      const link = stripXml((block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "");
      return { title, link };
    })
    .filter((row) => row.title.length > 12 && /^https?:\/\//i.test(row.link));
}

function isCivicHeadline(title: string): boolean {
  if (EXCLUDE.test(title)) return false;
  if (!INCLUDE.test(title)) return false;
  return PLACE.test(title) || /\b(ghmc|hmwssb|tgspdcl|hmda)\b/i.test(title);
}

async function fetchFeed(source: string, url: string): Promise<CivicHeadline[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ArohaHyderabad/1.0 (civic news ticker)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 900 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml)
    .filter((row) => isCivicHeadline(row.title))
    .slice(0, 12)
    .map((row) => ({
      id: `press:${row.link}`,
      title: row.title,
      href: row.link,
      source,
      kind: "press" as const,
      external: true,
    }));
}

async function caseHeadlines(): Promise<CivicHeadline[]> {
  const rows = await prisma.case.findMany({
    where: {
      status: { in: [...slaPolicy.openStatuses, slaPolicy.awaitingStatus] },
      sensitive: false,
    },
    orderBy: [{ supportCount: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      caseNumber: true,
      category: true,
      status: true,
      publicAddress: true,
      displayAddress: true,
      supportCount: true,
      createdAt: true,
    },
  });
  return rows
    .filter((row) => !skipBroadcast(row.category) && !isClosedStatus(row.status))
    .map((row) => ({
      id: `case:${row.caseNumber}`,
      title: `${getCategoryLabel(row.category)} · ${row.publicAddress || row.displayAddress} · ${daysOpen(row.createdAt)} days open`,
      href: casePath(row.caseNumber),
      source: "Aroha",
      kind: "case" as const,
      external: false,
    }));
}

async function loadPressHeadlines(): Promise<CivicHeadline[]> {
  const pressLists = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed.source, feed.url)));
  const press = pressLists.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set<string>();
  const uniquePress: CivicHeadline[] = [];
  for (const item of press) {
    const key = item.title.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePress.push(item);
  }
  return uniquePress.slice(0, 10);
}

const getPressHeadlines = unstable_cache(loadPressHeadlines, ["civic-press-headlines-v1"], {
  revalidate: 900,
});

export async function getCivicHeadlines(): Promise<CivicHeadline[]> {
  const [press, cases] = await Promise.all([getPressHeadlines(), caseHeadlines()]);
  const mixed: CivicHeadline[] = [];
  const pressQ = [...press];
  const caseQ = cases.slice(0, 8);
  while (pressQ.length || caseQ.length) {
    if (caseQ.length) mixed.push(caseQ.shift()!);
    if (pressQ.length) mixed.push(pressQ.shift()!);
  }
  return mixed.slice(0, 16);
}
