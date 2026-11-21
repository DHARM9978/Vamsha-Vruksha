
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  MasterDataManager,
  type MasterConfig,
} from "@/components/masters/master-data-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageFade } from "@/components/ui/motion";
import { requireAdmin } from "@/lib/guards";

const CONFIGS: Record<string, MasterConfig> = {
  gotra: {
    key: "gotra",
    title: "Gotra",
    description:
      "Lineage designations used across families. Values in use by records cannot be deleted.",
  },
  sutra: {
    key: "sutra",
    title: "Sutra",
    description:
      "Sutra traditions recorded with family and person heritage details.",
  },
  vamsha: {
    key: "vamsha",
    title: "Vamsha",
    description:
      "The great lineages (e.g. Surya, Chandra) that families belong to.",
  },
  "kula-devatha": {
    key: "kula_devatha",
    title: "Kula Devatha",
    description:
      "Family deities recorded with each family's heritage details.",
  },
  "mane-devru": {
    key: "mane_devru",
    title: "Mane Devru",
    description:
      "Household deities and shrines maintained by families.",
  },
  "panchang-sudhi": {
    key: "panchang_sudhi",
    title: "Panchang Sudhi",
    description:
      "Panchang sudhi references recorded with heritage details.",
  },
  "pooja-vruksha": {
    key: "pooja_vruksha",
    title: "Pooja Vruksha",
    description:
      "Sacred trees associated with family worship.",
  },
};

export const Route = createFileRoute("/app/masters/$master")({
  beforeLoad: ({ params }) => {
    requireAdmin();

    if (!CONFIGS[params.master]) {
      throw redirect({ to: "/app" });
    }
  },

  component: MasterRoute,

  head: () => ({
    meta: [
      { title: "Heritage Master — Vamsha Vruksha" },
      {
        name: "description",
        content:
          "Manage heritage master values with duplicate checks and in-use protection.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function MasterRoute() {
  const { master } = Route.useParams();
  const config = CONFIGS[master];

  // TypeScript cannot carry the beforeLoad validation into this component.
  // Validate again so config is guaranteed to exist before rendering.
  if (!config) {
    throw redirect({ to: "/app" });
  }

  return (
    <PageFade>
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbs={[{ label: config.title }]}
      />

      <MasterDataManager key={master} config={config} />
    </PageFade>
  );
}
