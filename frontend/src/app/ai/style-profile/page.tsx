import { redirect } from "next/navigation";

/** Style profile step removed — redirect into body profile flow. */
export default function StyleProfileRedirectPage() {
  redirect("/ai/body-profile");
}
