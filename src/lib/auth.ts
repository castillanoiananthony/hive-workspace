import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail, signInEmail } from "./email";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined; // Google sign-in switches on once both keys are in .env.local

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: google,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // local dev convenience: the link also appears in the terminal running `npm run dev`
        if (process.env.NODE_ENV !== "production") console.info(`[magic link] ${email}: ${url}`);
        const { html, text } = signInEmail(url);
        await sendEmail(email, "Your HIVE-WORKSPACE sign-in link", html, text);
      },
    }),
    nextCookies(), // must stay last: lets server actions set the session cookie
  ],
});

export const googleEnabled = Boolean(google);

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
