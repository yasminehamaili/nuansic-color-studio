import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "@/components/auth/SignUpPage";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: SignUpPage,
});
