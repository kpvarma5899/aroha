import { daysOpen } from "./cases";
import { slaPolicy, type SlaStep } from "./policy";

export type { SlaStep };

export type SlaContact = { role: string };

export type SlaView = {
  days: number;
  current: SlaStep | null;
  next: SlaStep | null;
  done: boolean;
  dueLabel: string;
};

export function stepsForContacts(contacts: SlaContact[]): SlaStep[] {
  return slaPolicy.steps.filter((step) => {
    const hit = contacts.some((contact) => step.roles.includes(contact.role));
    if (!hit && step.skipIfNoContacts) return false;
    return true;
  });
}

export function slaView(input: {
  createdAt: Date;
  lastEscalationKey: string;
  contacts: SlaContact[];
  now?: Date;
}): SlaView {
  const days = daysOpen(input.createdAt, input.now);
  const steps = stepsForContacts(input.contacts);
  const doneKeys = input.lastEscalationKey.split(",").filter(Boolean);
  const pending = steps.filter((step) => !doneKeys.includes(step.id));
  const current = [...steps].reverse().find((step) => doneKeys.includes(step.id)) ?? null;
  const next = pending[0] ?? null;
  return {
    days,
    current,
    next,
    done: pending.length === 0,
    dueLabel: next ? next.label : steps[steps.length - 1]?.label ?? "",
  };
}

export function dueSteps(input: {
  createdAt: Date;
  lastEscalationKey: string;
  contacts: SlaContact[];
  now?: Date;
}): SlaStep[] {
  const days = daysOpen(input.createdAt, input.now);
  const doneKeys = input.lastEscalationKey.split(",").filter(Boolean);
  return stepsForContacts(input.contacts).filter(
    (step) => !doneKeys.includes(step.id) && days >= step.afterDays,
  );
}

export function markStepDone(lastEscalationKey: string, stepId: string): string {
  const keys = lastEscalationKey.split(",").filter(Boolean);
  if (!keys.includes(stepId)) keys.push(stepId);
  return keys.join(",");
}
