import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  ),
});
