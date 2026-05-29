import { redirect } from "next/navigation";

export default function Home() {
  // Gracefully redirect from root to the secure dashboard
  redirect("/dashboard");
}
