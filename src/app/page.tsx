import { redirect } from "next/navigation";

// signed-out visitors are sent to /login by src/proxy.ts before this runs
export default function Home() {
  redirect("/home");
}
