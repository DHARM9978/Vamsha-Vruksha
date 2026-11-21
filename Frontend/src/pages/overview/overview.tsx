
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  FilePlus2,
  History,
  Network,
  RefreshCw,
  TreeDeciduous,
  UserPlus,
  Users,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";

import { api, type ApiResponse } from "@/lib/api-client";
import type { Session } from "@/types";

const QUICK_ACTIONS_ADMIN = [
  { label: "Create Family", to: "/app/families/new", icon: FilePlus2 },
  { label: "Add Person", to: "/app/people/new", icon: UserPlus },
  { label: "Add Relation", to: "/app/relations/new", icon: Network },
  { label: "Explore Family Tree", to: "/app/tree", icon: TreeDeciduous },
  { label: "View Family Details", to: "/app/family-details", icon: BookOpen },
];

const QUICK_ACTIONS_USER = [
  { label: "Explore Family Tree", to: "/app/tree", icon: TreeDeciduous },
  { label: "View Family Details", to: "/app/family-details", icon: BookOpen },
];

interface OverviewStatistics {
  totalFamilies: number;
  totalPeople: number;
  totalRelationships: number;
  totalUsers?: number;
}

interface RecentAddition {
  type: "family" | "person" | "relationship";
  id: number | string;
  title: string;
  createdAt: string | null;
  dateAvailable: boolean;
}

interface OverviewData {
  overviewType: "Admin" | "User";
  statistics: OverviewStatistics;
  recentAdditions: {
    families: RecentAddition[];
    persons: RecentAddition[];
    relationships: RecentAddition[];
    note?: string;
  };
}

interface ActivityItem extends RecentAddition {
  uniqueKey: string;
}

function formatActivityDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getActivityItems(data: OverviewData): ActivityItem[] {
  const additions = data.recentAdditions;

  return [
    ...additions.families,
    ...additions.persons,
    ...additions.relationships,
  ]
    .map((item) => ({
      ...item,
      uniqueKey: `${item.type}-${item.id}`,
    }))
    .sort((a, b) => {
      // Records without a real creation timestamp are kept after dated records.
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
}

export function OverviewPage({ session }: { session: Session }) {
  const isAdmin = session.role === "admin";

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isAdmin
        ? "/overview/admin"
        : "/overview/user";

      const response = await api.get<ApiResponse<OverviewData>>(
        endpoint
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Unable to load overview information."
        );
      }

      setOverview(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard information."
      );
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const statistics = overview?.statistics;
  const activity = overview ? getActivityItems(overview) : [];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${session.fullName.split(" ")[0]}`}
        description={
          isAdmin
            ? "You're signed in as Admin — manage families, people, relationships and heritage masters."
            : "You're signed in as a User — explore the family tree and family details."
        }
        breadcrumbs={[]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadOverview()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* API error */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Could not load dashboard data
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadOverview()}
            disabled={isLoading}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          {isLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <StatCard
              icon={TreeDeciduous}
              label="Total Families"
              value={statistics?.totalFamilies ?? 0}
            />
          )}
        </StaggerItem>

        <StaggerItem>
          {isLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <StatCard
              icon={Users}
              label="Total People"
              value={statistics?.totalPeople ?? 0}
              tone="sage"
            />
          )}
        </StaggerItem>

        <StaggerItem>
          {isLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <StatCard
              icon={Network}
              label="Total Relationships"
              value={statistics?.totalRelationships ?? 0}
            />
          )}
        </StaggerItem>

        {isAdmin && (
          <StaggerItem>
            {isLoading ? (
              <Skeleton className="h-28 w-full rounded-xl" />
            ) : (
              <StatCard
                icon={Activity}
                label="Total Users"
                value={statistics?.totalUsers ?? 0}
                tone="gold"
              />
            )}
          </StaggerItem>
        )}
      </Stagger>

      {/* Quick actions */}
      <FadeIn delay={0.1} className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(isAdmin ? QUICK_ACTIONS_ADMIN : QUICK_ACTIONS_USER).map(
            (action) => (
              <Link
                key={action.to + action.label}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon
                    className="size-4.5"
                    aria-hidden="true"
                  />
                </span>

                <span className="text-sm font-semibold text-foreground">
                  {action.label}
                </span>
              </Link>
            )
          )}
        </div>
      </FadeIn>

      {/* Recent additions */}
      <FadeIn delay={0.16} className="mt-8">
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <History
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                Recent additions
              </h2>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                Live data
              </span>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-10 w-full rounded-lg"
                  />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={History}
                title="No recent additions"
                description="New families, people and relationships will appear here."
                className="mt-4 border-0 bg-transparent"
              />
            ) : (
              <ul className="mt-4 space-y-2">
                {activity.slice(0, 10).map((entry) => (
                  <li
                    key={entry.uniqueKey}
                    className="flex items-start justify-between gap-4 rounded-lg px-3 py-2 text-sm transition-colors odd:bg-muted/50"
                  >
                    <span className="min-w-0 text-foreground">
                      {entry.title}
                    </span>

                    <time
                      dateTime={entry.createdAt ?? undefined}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatActivityDate(entry.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}

            {overview?.recentAdditions.note && (
              <p className="mt-4 text-xs text-muted-foreground">
                {overview.recentAdditions.note}
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
