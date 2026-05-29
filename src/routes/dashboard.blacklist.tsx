import { createFileRoute } from "@tanstack/react-router";
import { CustomerBlacklist } from "@/components/customer-blacklist";

export const Route = createFileRoute("/dashboard/blacklist")({
  head: () => ({
    meta: [
      { title: "Customer Blacklist | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerBlacklist,
});
