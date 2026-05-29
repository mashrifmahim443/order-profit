import { createFileRoute } from "@tanstack/react-router";
import { ManageData } from "@/components/manage-data";

export const Route = createFileRoute("/dashboard/manage")({
  head: () => ({
    meta: [
      { title: "Manage Data | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageData,
});
