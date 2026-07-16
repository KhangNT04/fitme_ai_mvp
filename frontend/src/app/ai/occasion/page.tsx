import { redirect } from "next/navigation";

/** Occasion step removed — redirect into body profile flow. */
export default function OccasionRedirectPage() {
  redirect("/ai/body-profile");
}
