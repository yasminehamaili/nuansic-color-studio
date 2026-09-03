import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/components/auth/ForgotPasswordPage";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "nuansic" }],
  }),
  component: ForgotPasswordPage,
});
