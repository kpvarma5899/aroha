import Link from "next/link";
import { auth, signOut } from "@/auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getLocale } from "@/lib/i18n-server";
import { messagesFor } from "@/lib/i18n";

export async function SiteHeader() {
  const session = await auth();
  const staff = session?.user?.account === "staff";
  const citizen = session?.user?.account === "citizen";
  const locale = await getLocale();
  const copy = messagesFor(locale);

  return (
    <header className="border-b border-line bg-moss text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-6 px-4 py-4">
        <Link href="/" className="group">
          <p className="font-serif text-2xl tracking-tight">{copy.brand}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-paper/70">{copy.tagline}</p>
        </Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm">
          <Link href="/" className="hover:underline">
            {copy.nav.cases}
          </Link>
          <Link href="/report" className="hover:underline">
            {copy.nav.file}
          </Link>
          <Link href="/map" className="hover:underline">
            {copy.nav.map}
          </Link>
          <Link href="/scoreboard" className="hover:underline">
            {copy.nav.scoreboard}
          </Link>
          {staff ? (
            <Link href="/admin" className="hover:underline">
              {copy.nav.desk}
            </Link>
          ) : null}
          {citizen ? (
            <Link href="/complaints" className="hover:underline">
              {copy.nav.mine}
            </Link>
          ) : null}
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="hover:underline">
                {copy.nav.signOut}
              </button>
            </form>
          ) : (
            <Link href="/login" className="hover:underline">
              {copy.nav.phone}
            </Link>
          )}
          <LanguageToggle locale={locale} english={copy.nav.english} telugu={copy.nav.telugu} />
        </nav>
      </div>
    </header>
  );
}
