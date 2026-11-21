import { cn } from "@/lib/utils";

/** Leaf-tree brand glyph + wordmark lockup. */
export function Logo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground",
          markClassName,
        )}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M12 21v-7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 14c-3.6 0-6.2-2.4-6.6-6.4C9 7.2 11.4 9.4 12 14Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M12 14c3.6 0 6.2-2.4 6.6-6.4C15 7.2 12.6 9.4 12 14Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M12 10.5C12 7 10.4 4.6 8 3.6c1.6-.9 3.4-.8 4.9.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[19px] font-semibold tracking-wide text-current">
            Vamsha Vruksha
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Family Heritage
          </span>
        </span>
      )}
    </span>
  );
}
