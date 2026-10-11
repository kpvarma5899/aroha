"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type StaffRow = {
  id: string;
  userCode: string;
  username: string;
  email: string | null;
  name: string;
  details: string;
  phone: string | null;
  role: string;
  active: boolean;
};

function CreateForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        username: String(form.get("username") || ""),
        password: String(form.get("password") || ""),
        details: String(form.get("details") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        role: String(form.get("role") || "employee"),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create the user.");
      return;
    }
    event.currentTarget.reset();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <label className="block text-sm">
        Name
        <input name="name" required className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Username
        <input
          name="username"
          required
          autoComplete="off"
          placeholder="e.g. priya_r"
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" minLength={8} required className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Details
        <textarea
          name="details"
          rows={4}
          placeholder="Role on the desk, area they cover, desk phone, notes."
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Phone (optional)
          <input name="phone" className="mt-1 w-full border border-line bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Email (optional)
          <input name="email" type="email" className="mt-1 w-full border border-line bg-paper px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm">
        Role
        <select name="role" defaultValue="employee" className="mt-1 w-full border border-line bg-paper px-3 py-2">
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {error ? <p className="text-clay">{error}</p> : null}
      <button type="submit" disabled={busy} className="border border-moss bg-moss px-5 py-2 text-paper">
        {busy ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}

function ResetForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setBusy(false);
      setError("The two passwords do not match.");
      return;
    }
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not reset the password.");
      return;
    }
    event.currentTarget.reset();
    setSaved(true);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-line pt-4">
      <p className="text-sm font-medium">Reset password</p>
      <label className="block text-sm">
        New password
        <input name="password" type="password" minLength={8} required className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Confirm password
        <input name="confirm" type="password" minLength={8} required className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      {error ? <p className="text-clay">{error}</p> : null}
      {saved ? <p className="text-sm text-moss">Password updated. Share it with them out of band.</p> : null}
      <button type="submit" disabled={busy} className="border border-line px-4 py-2 text-sm">
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function AdminUserManager({ people }: { people: StaffRow[] }) {
  const router = useRouter();
  const [openReset, setOpenReset] = useState<string | null>(null);

  return (
    <div>
      <ul className="mt-8 space-y-4">
        {people.map((person) => (
          <li key={person.id} className="border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-2xl">{person.name}</p>
                <p className="mt-1 text-sm text-ink/70">
                  @{person.username} · {person.role}
                  {person.active ? "" : " · inactive"}
                </p>
              </div>
              <button
                type="button"
                className="border border-line px-3 py-1.5 text-sm"
                onClick={() => setOpenReset((id) => (id === person.id ? null : person.id))}
              >
                Reset password
              </button>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-ink/50">User ID</dt>
                <dd className="font-mono text-sm tracking-wide">{person.userCode}</dd>
              </div>
              {person.phone ? (
                <div>
                  <dt className="text-ink/50">Phone</dt>
                  <dd>{person.phone}</dd>
                </div>
              ) : null}
              {person.email ? (
                <div>
                  <dt className="text-ink/50">Email</dt>
                  <dd>{person.email}</dd>
                </div>
              ) : null}
            </dl>
            {person.details ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{person.details}</p> : null}
            {openReset === person.id ? <ResetForm id={person.id} onDone={() => router.refresh()} /> : null}
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-serif text-2xl">Create user</h2>
      <p className="mt-2 text-sm text-ink/70">
        They sign in at /admin/login with username and password. User ID is assigned automatically
        (005… like a Salesforce user id) and is unique.
      </p>
      <CreateForm onDone={() => router.refresh()} />
    </div>
  );
}
