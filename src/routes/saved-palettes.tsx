import { createFileRoute } from "@tanstack/react-router";
import { SavedPalettesPage } from "@/components/nuansic/SavedPalettesPage";

export const Route = createFileRoute("/saved-palettes")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: SavedPalettesPage,
});
