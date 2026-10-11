import { getCategoryLabel } from "@/lib/categories";
import type { ResolvedContact } from "@/lib/types";

const TWEET_LIMIT = 280;
const URL_WEIGHT = 23;

export type CaseTweetInput = {
  caseNumber: string;
  category: string;
  description: string;
  displayAddress: string;
  trackUrl: string;
  contacts: Pick<ResolvedContact, "name" | "role" | "twitterHandle">[];
};

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const handle = raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").split(/[/?]/)[0];
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  return handle;
}

export function tweetIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function tweetLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(URL_WEIGHT)).length;
}

function shorten(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function composeCaseTweets(input: CaseTweetInput): { tweets: string[]; intentUrl: string } {
  const handles = [
    ...new Set(input.contacts.map((contact) => normalizeHandle(contact.twitterHandle)).filter(Boolean)),
  ] as string[];
  const tags = handles.map((handle) => `@${handle}`).join(" ");
  const named = input.contacts
    .filter((contact) => !normalizeHandle(contact.twitterHandle) && contact.role !== "Helpline")
    .map((contact) => `${contact.name} (${contact.role})`);
  const issue = getCategoryLabel(input.category);
  const place = shorten(input.displayAddress, 80);
  const details = shorten(input.description, 140);
  const ask = "Please inspect and fix this.";
  const footer = `Case ${input.caseNumber}\n${input.trackUrl}`;
  const body = `${issue} at ${place}.\n\n${details}\n\n${ask}`;
  const namesLine = named.length ? `Also: ${shorten(named.join("; "), 160)}` : "";

  const withTags = tags ? `${body}\n\n${tags}\n${footer}` : `${body}\n\n${footer}`;
  if (tweetLength(withTags) <= TWEET_LIMIT) {
    return { tweets: [withTags], intentUrl: tweetIntentUrl(withTags) };
  }

  const first = tweetLength(`${body}\n\n${footer}`) <= TWEET_LIMIT ? `${body}\n\n${footer}` : `${issue} at ${place}.\n\n${ask}\n\n${footer}`;
  let second = [tags, namesLine, "Please act on this civic case."].filter(Boolean).join("\n");
  if (tweetLength(second) > TWEET_LIMIT) second = shorten(second, TWEET_LIMIT);
  const tweets = second.trim() ? [first, second] : [first];
  return { tweets, intentUrl: tweetIntentUrl(tweets.join("\n\n")) };
}

export function composeEscalationTweet(input: {
  caseNumber: string;
  stepLabel: string;
  daysOpen: number;
  trackUrl: string;
  handles: string[];
}): { text: string; intentUrl: string } {
  const tags = [...new Set(input.handles)].map((handle) => `@${handle.replace(/^@/, "")}`).join(" ");
  const text = shorten(
    `${tags ? `${tags} ` : ""}Case ${input.caseNumber} is still open after ${input.daysOpen} days. Please ${input.stepLabel.toLowerCase()} inspect and fix this.\n${input.trackUrl}`,
    TWEET_LIMIT,
  );
  return { text, intentUrl: tweetIntentUrl(text) };
}

export function composeDigestTweets(input: {
  area: string;
  lines: string[];
}): { tweets: string[]; intentUrl: string } {
  const header = `Open civic cases in ${input.area} — please inspect and fix.`;
  const chunks: string[] = [];
  let current = header;
  for (const line of input.lines) {
    const next = `${current}\n${line}`;
    if (tweetLength(next) <= TWEET_LIMIT) {
      current = next;
    } else {
      chunks.push(current);
      current = line;
    }
  }
  if (current.trim()) chunks.push(current);
  return { tweets: chunks, intentUrl: tweetIntentUrl(chunks.join("\n\n")) };
}
