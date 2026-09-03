import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/nuansic/ProfilePage";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: ProfilePage,
});
