import { createFileRoute } from "@tanstack/react-router";
import { UpgradePage } from "@/components/nuansic/UpgradePage";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: UpgradePage,
});
