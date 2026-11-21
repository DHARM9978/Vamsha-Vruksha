import { CountUp } from "@/components/ui/count-up";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  delay = 0,
  className,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  delay?: number;
  className?: string;
  tone?: "primary" | "gold" | "sage";
}) {
  return (
    <Card
      className={cn(
        "shadow-soft transition-shadow hover:shadow-card",
        tone === "gold" && "border-gold/35",
        className,
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "sage" && "bg-sage/20 text-primary",
            tone === "gold" && "bg-gold/15 text-gold",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            <CountUp value={value} />
          </div>
          <div className="truncate text-[13px] font-medium text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
