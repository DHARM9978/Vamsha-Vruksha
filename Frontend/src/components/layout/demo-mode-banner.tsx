import { FlaskConical } from "lucide-react";

/** Persistent, obvious marker that the prototype runs on mock data only. */
export function DemoModeBanner({ className }: { className?: string }) {
  return (
    <span
      className={cnDemo(className)}
      title="This prototype uses local mock data. No backend, email or OTP service is connected."
    >
      <FlaskConical className="size-3 shrink-0" aria-hidden="true" />
      Demo mode — no backend connected
    </span>
  );
}

function cnDemo(className?: string) {
  return [
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
