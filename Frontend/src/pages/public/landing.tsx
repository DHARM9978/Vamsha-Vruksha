import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Network,
  ShieldCheck,
  TreeDeciduous,
  Users,
  RefreshCw,
} from "lucide-react";
import heroTree from "@/assets/hero-tree.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ApiResponse } from "@/lib/api-client";

const FEATURES = [
  {
    icon: TreeDeciduous,
    title: "Family Tree Visualization",
    text: "Explore your lineage on an interactive tree — pan, zoom and open any member to see their branch at a glance.",
  },
  {
    icon: Users,
    title: "Member Management",
    text: "Keep every member's personal, contact and heritage details complete, consistent and easy to update.",
  },
  {
    icon: Network,
    title: "Relationship Mapping",
    text: "Record how members relate — parents, siblings, spouses — across families with clear, readable mapping.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    text: "Administrators curate family records; members explore their heritage. Everyone sees exactly what they should.",
  },
];

interface PublicStatistics {
  totalFamilies: number;
  totalPeople: number;
  totalRelationships: number;
  totalUsers: number;
}

const EMPTY_STATISTICS: PublicStatistics = {
  totalFamilies: 0,
  totalPeople: 0,
  totalRelationships: 0,
  totalUsers: 0,
};

export function LandingPage() {
  const reduced = useReducedMotion();
  const [statistics, setStatistics] = useState<PublicStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState("");

  const loadPublicStatistics = useCallback(async () => {
    setIsLoading(true);
    setStatisticsError("");

    try {
      const response = await api.get<ApiResponse<PublicStatistics>>(
        "/overview/public-stats",
        { auth: false }
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Unable to load public statistics."
        );
      }

      setStatistics(response.data);
    } catch (error) {
      setStatistics(null);
      setStatisticsError(
        error instanceof Error
          ? error.message
          : "Unable to load public statistics."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPublicStatistics();
  }, [loadPublicStatistics]);

  const displayedStatistics = statistics ?? EMPTY_STATISTICS;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-sage/50 bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                <TreeDeciduous className="size-3.5" aria-hidden="true" />
                Heritage, preserved
              </span>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-wide text-foreground sm:text-5xl lg:text-6xl">
                Discover Your
                <br />
                <span className="text-primary">Family Heritage</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Vamsha Vruksha helps families preserve their lineage — record members and
                relationships, keep cultural heritage close, and explore an interactive family tree
                that grows with every generation.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/login">
                    Explore Family Tree
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/about">Learn more</Link>
                </Button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.12} y={16}>
            <motion.div
              {...(!reduced ? { animate: { y: [0, -8, 0] } } : {})}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img
                src={heroTree}
                alt="Illustration of a family tree with portraits connected along its branches"
                width={1024}
                height={896}
                className="mx-auto w-full max-w-lg rounded-3xl border border-border shadow-card"
              />
            </motion.div>
          </FadeIn>
        </div>
      </section>

      {/* Live public metrics */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        {statisticsError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
          >
            <p className="text-sm text-muted-foreground">
              Public statistics could not be loaded. {statisticsError}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadPublicStatistics()}
              disabled={isLoading}
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        )}

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <StatCard
                icon={TreeDeciduous}
                label="Total Families"
                value={displayedStatistics.totalFamilies}
              />
            )}
          </StaggerItem>
          <StaggerItem>
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <StatCard
                icon={Users}
                label="Total Persons"
                value={displayedStatistics.totalPeople}
                tone="sage"
              />
            )}
          </StaggerItem>
          <StaggerItem>
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <StatCard
                icon={Network}
                label="Total Relations"
                value={displayedStatistics.totalRelationships}
              />
            )}
          </StaggerItem>
          <StaggerItem>
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <StatCard
                icon={ShieldCheck}
                label="Total Users"
                value={displayedStatistics.totalUsers}
                tone="gold"
              />
            )}
          </StaggerItem>
        </Stagger>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Live statistics from the Vamsha Vruksha database.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
            Everything your family's memory needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            One calm place for people, relationships and heritage — designed to feel effortless for
            every generation.
          </p>
        </FadeIn>
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
              <Card className="h-full shadow-soft transition-shadow hover:shadow-card">
                <CardContent className="flex gap-4 p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Heritage note */}
      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <p className="mb-6 text-4xl font-bold tracking-tight text-primary">
            {isLoading ? " " : (
              <>
                <CountUp value={displayedStatistics.totalPeople} /> members ·{" "}
                <CountUp value={displayedStatistics.totalFamilies} /> families
              </>
            )}
          </p>
          <p className="font-display text-2xl italic leading-relaxed text-foreground sm:text-3xl">
            “A family tree is not just names and dates — it is the story of where you come from,
            kept alive for everyone who comes after.”
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            The Vamsha Vruksha idea
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <FadeIn>
          <h2 className="font-display text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
            Begin your family's record today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create an account to preserve your family's lineage, relationships and cultural
            heritage.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">Create an account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
