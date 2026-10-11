"use client";

import Link from "next/link";
import type { CivicHeadline } from "@/lib/civic-news";

export function NewsTicker({
  items,
  kicker,
}: {
  items: CivicHeadline[];
  kicker: string;
}) {
  if (items.length === 0) return null;
  const loop = items.length < 6 ? [...items, ...items] : items;
  const track = [...loop, ...loop];

  return (
    <div className="news-ticker border-b border-moss-2 bg-moss text-paper">
      <div className="mx-auto flex max-w-none items-stretch">
        <p className="flex shrink-0 items-center bg-clay px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {kicker}
        </p>
        <div className="news-ticker-mask min-w-0 flex-1">
          <div className="news-ticker-track">
            {track.map((item, index) =>
              item.external ? (
                <a
                  key={`${item.id}-${index}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="news-ticker-item"
                >
                  <span className="text-paper/55">{item.source}</span>
                  <span>{item.title}</span>
                </a>
              ) : (
                <Link key={`${item.id}-${index}`} href={item.href} className="news-ticker-item">
                  <span className="text-paper/55">{item.source}</span>
                  <span>{item.title}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
