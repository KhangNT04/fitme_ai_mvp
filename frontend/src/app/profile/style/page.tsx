import { redirect } from "next/navigation";

/** Style profile editor removed — body profile is the main user profile. */
export default function ProfileStyleRedirect() {
  redirect("/profile/body");
}
