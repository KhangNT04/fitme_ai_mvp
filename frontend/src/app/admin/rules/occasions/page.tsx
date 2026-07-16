import { redirect } from "next/navigation";

/** Admin occasion rules UI removed from product flow. */
export default function AdminOccasionRulesRedirect() {
  redirect("/admin/dashboard");
}
