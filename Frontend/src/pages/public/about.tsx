import { Link } from "@tanstack/react-router";
import { BookOpen, Network, ShieldCheck, TreeDeciduous } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

const PILLARS = [
  {
    icon: TreeDeciduous,
    title: "Heritage Preservation",
    text: "Record gotra, sutra, vamsha, kula devatha, mane devru and more — the details that anchor a family's identity.",
  },
  {
    icon: BookOpen,
    title: "Family Management",
    text: "Create and maintain family records with reference IDs, native places and a complete head-of-family profile.",
  },
  {
    icon: Network,
    title: "Visualization",
    text: "See branches come alive as an interactive family tree, with every relationship drawn clearly and legibly.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Role-Based Access",
    text: "Admins manage records; members explore. Access is scoped by role so every family stays in trusted hands.",
  },
];

export function AboutPage() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <FadeIn>
          <h1 className="font-display text-4xl font-semibold tracking-wide text-foreground sm:text-5xl">
            About Vamsha Vruksha
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Vamsha Vruksha — “the family tree” — is a calm, elegant home for your lineage. It helps
            families record their members, map the relationships that bind them, and carry their
            cultural heritage forward, generation after generation.
          </p>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <Card className="h-full shadow-soft transition-shadow hover:shadow-card">
                <CardContent className="flex gap-4 p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <p.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-foreground">{p.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <FadeIn>
            <h2 className="font-display text-3xl font-semibold tracking-wide text-foreground">
              Our mission
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              To make lineage documentation effortless and beautiful, so that no family loses the
              thread of where it came from. Simple tools, warm design, and records that stay
              readable for the generations who inherit them.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/login">Explore the demo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
