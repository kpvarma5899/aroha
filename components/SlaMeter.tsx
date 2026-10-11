export function SlaMeter({
  title,
  days,
  label,
  done,
  steps,
}: {
  title: string;
  days: number;
  label: string;
  done: boolean;
  steps: { id: string; label: string; afterDays: number; done: boolean }[];
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-ink/70">
        {days} days open{done ? "" : ` · ${label}`}
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <li key={step.id} className={`border px-3 py-2 text-sm ${step.done ? "border-moss bg-paper-2" : "border-line"}`}>
            <p className="text-xs uppercase tracking-[0.14em] text-moss">Day {step.afterDays}</p>
            <p className="mt-1">{step.label}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
