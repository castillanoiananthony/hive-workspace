import type { Metadata } from "next";
import { AuthPage } from "../signin/AuthPage";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return <AuthPage mode="signup" />;
}
