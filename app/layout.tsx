import { Fraunces, Figtree, Noto_Sans_Telugu } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const telugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "600", "700"],
  variable: "--font-telugu",
  display: "swap",
});

export const metadata = {
  title: "Aroha — Hyderabad",
  description:
    "Aroha is civic accountability for Hyderabad. Report a problem, see who owns the work, and track whether it is still open or fixed.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${telugu.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
