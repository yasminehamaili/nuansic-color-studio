import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/nuansic/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: SettingsPage,
});
