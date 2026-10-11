import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff";
import { AdminUserManager } from "@/components/AdminUserManager";

export default async function AdminStaffPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin");
  const people = await prisma.staff.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userCode: true,
      username: true,
      email: true,
      name: true,
      details: true,
      phone: true,
      role: true,
      active: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl">Users</h1>
      <p className="mt-2 text-sm text-ink/70">
        Create desk users. Each gets a generated User ID, then you set username, password, and
        details. Reset a password if they are locked out.
      </p>
      <AdminUserManager people={people} />
    </div>
  );
}
