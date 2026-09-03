import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import { Header } from "../../../src/components/nuansic/Header";
import { Hero } from "../../../src/components/nuansic/Hero";
import { Workspace } from "../../../src/components/nuansic/Workspace";
import { Creatives } from "../../../src/components/nuansic/Creatives";
import { Footer } from "../../../src/components/nuansic/Footer";
import PaletteGenerator from "../../../src/components/PaletteGenerator";
import { ColorOfTheDay } from "../../../src/components/nuansic/ColorOfTheDay";

// inside your route's component:

export const Route = createFileRoute()({
  head: () => ({
    meta: [
      { title: "nuansic" },
      {
        name: "description",
        content:
          "Pick a color, upload an image, choose your field — nuansic builds palettes that actually make sense for designers, fashion, UI/UX and interiors.",
      },
      { property: "og:title", content: "nuansic" },
      {
        property: "og:description",
        content:
          "Extract colors from any image and generate field-tuned palettes for design, fashion, UI/UX and interiors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const openPickerRef = useRef<(() => void) | null>(null);

  const register = useCallback((fn: () => void) => {
    openPickerRef.current = fn;
  }, []);

  const scrollAndOpen = () => {
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => openPickerRef.current?.(), 600);
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero onUploadClick={scrollAndOpen} />
      <Workspace registerOpenPicker={register} />
      <ColorOfTheDay />
      <PaletteGenerator />
      <Creatives />
      <Footer />
    </main>
  );
}
