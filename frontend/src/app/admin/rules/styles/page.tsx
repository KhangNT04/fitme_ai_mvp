import { redirect } from "next/navigation";

/** Admin style rules UI removed from product flow. */
export default function AdminStyleRulesRedirect() {
  redirect("/admin/dashboard");
}
