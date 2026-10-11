import { getCategoryLabel } from "@/lib/categories";
import type { AccountabilityBrief, ResolveResult } from "@/lib/types";

export function parseStoredBrief(raw: string): AccountabilityBrief | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as AccountabilityBrief;
    if (typeof row.summary !== "string" || !Array.isArray(row.questions)) return null;
    return row;
  } catch {
    return null;
  }
}

function fallbackBrief(resolved: ResolveResult, description: string, address: string): AccountabilityBrief {
  const issue = getCategoryLabel(resolved.category);
  return {
    summary: resolved.inCoverage
      ? `${issue} at ${address} is owned by the sourced offices below — the department that does the work, then officers for this area, then the MLA and MP if the department does not act.`
      : resolved.message || "This pin is outside the Hyderabad area we map.",
    questions: resolved.contacts.map((contact) => ({
      name: contact.name,
      role: contact.role,
      agency: contact.agency,
      why: contact.reason,
      ask: `Please inspect and act on this ${issue.toLowerCase()} at ${address}. ${description.slice(0, 280)}`,
    })),
    nextStep: resolved.inCoverage
      ? "File the case. Our desk will email these offices and update this page."
      : "Move the pin into Hyderabad to see who should be questioned.",
    model: "sourced-records",
  };
}

function parseBrief(raw: unknown, resolved: ResolveResult): AccountabilityBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const summary = typeof row.summary === "string" ? row.summary.trim() : "";
  const nextStep = typeof row.nextStep === "string" ? row.nextStep.trim() : "";
  const questions = Array.isArray(row.questions)
    ? row.questions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const q = item as Record<string, unknown>;
          if (typeof q.name !== "string" || typeof q.why !== "string") return null;
          return {
            name: q.name.trim(),
            role: typeof q.role === "string" ? q.role.trim() : "",
            agency: typeof q.agency === "string" ? q.agency.trim() : "",
            why: q.why.trim(),
            ask: typeof q.ask === "string" ? q.ask.trim() : "",
          };
        })
        .filter((item): item is AccountabilityBrief["questions"][number] => Boolean(item))
    : [];
  if (!summary) return null;
  const allowed = new Set(resolved.contacts.map((contact) => contact.name.toLowerCase()));
  const grounded = questions
    .map((question) => {
      const match = resolved.contacts.find((contact) => contact.name.toLowerCase() === question.name.toLowerCase());
      if (!match || !allowed.has(match.name.toLowerCase())) return null;
      return {
        name: match.name,
        role: match.role,
        agency: match.agency,
        why: question.why || match.reason,
        ask: question.ask,
      };
    })
    .filter((item): item is AccountabilityBrief["questions"][number] => Boolean(item));
  return {
    summary,
    questions: grounded.length ? grounded : fallbackBrief(resolved, "", "").questions,
    nextStep: nextStep || fallbackBrief(resolved, "", "").nextStep,
    model: "llm",
  };
}

export async function writeAccountabilityBrief(
  resolved: ResolveResult,
  description: string,
  address: string,
): Promise<AccountabilityBrief> {
  const fallback = fallbackBrief(resolved, description, address);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !resolved.inCoverage || resolved.contacts.length === 0) {
    return fallback;
  }

  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const roster = resolved.contacts.map((contact) => ({
    name: contact.name,
    role: contact.role,
    agency: contact.agency,
    reason: contact.reason,
    source: contact.sourceLabel,
  }));

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write short accountability briefs for Hyderabad civic problems. You may ONLY name people and agencies from the sourced roster. Never invent a person, phone, email, ward, or corporator. Residents will only see who owns the work — our desk emails the offices. If the roster is silent, say so. Return JSON with keys: summary, questions (array of {name, role, agency, why, ask}), nextStep. summary = two or three sentences on who owns this. why = why this office owns the work. ask = what our desk should demand. Do not tell the resident to call or email anyone.",
          },
          {
            role: "user",
            content: JSON.stringify({
              category: resolved.category,
              address,
              description,
              jurisdictions: resolved.jurisdictions,
              corporatorNote: resolved.corporatorNote,
              sourcedRoster: roster,
            }),
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("LLM brief failed", res.status, await res.text());
      return fallback;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = parseBrief(JSON.parse(content) as unknown, resolved);
    if (!parsed) return fallback;
    return { ...parsed, model };
  } catch (error) {
    console.error(error);
    return fallback;
  }
}
