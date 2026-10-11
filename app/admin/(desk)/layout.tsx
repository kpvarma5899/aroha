import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/staff";

export default async function AdminDeskLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  if (!staff) redirect("/admin/login");

  return (
    <div>
      <div className="border-b border-line bg-paper-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-3 text-sm">
          <span className="text-ink/55">
            {staff.name}
            {staff.username ? ` · @${staff.username}` : ""} · {staff.role}
          </span>
          <Link href="/admin" className="underline">
            Cases
          </Link>
          <Link href="/admin/press" className="underline">
            Press
          </Link>
          <Link href="/scoreboard" className="underline">
            Scoreboard
          </Link>
          {staff.role === "admin" ? (
            <Link href="/admin/staff" className="underline">
              Users
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
