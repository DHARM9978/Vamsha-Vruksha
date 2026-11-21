import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label-above-field wrapper with required marker and inline error. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Consistent password policy used by Sign Up, Forgot/Reset and Change Password. */
export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export function PasswordRuleChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              ok ? "text-success" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 items-center justify-center rounded-full border text-[9px] font-bold",
                ok ? "border-success bg-success/15" : "border-border",
              )}
            >
              {ok ? "✓" : ""}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function passwordValid(value: string) {
  return PASSWORD_RULES.every((r) => r.test(value));
}
