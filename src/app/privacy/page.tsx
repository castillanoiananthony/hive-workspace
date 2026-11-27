import type { Metadata } from "next";
import { LegalPage } from "@/components/app/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="28 November 2026">
      <p>HIVE-WORKSPACE is a student project by Ian Anthony H. Castillano. This page says what it keeps about you, why, and how to get it removed. There are no ads, no trackers and no analytics.</p>
      <h2>If you have an account</h2>
      <ul>
        <li><strong>Your email address and name</strong>, to sign you in and to tell your teammates who assigned a task. If you sign in with Google, we receive only your name, email address and profile picture.</li>
        <li><strong>What you write</strong>: goals, tasks, notes, checklists, links, teams and templates.</li>
        <li><strong>Settings</strong>: theme, text size, time zone, and the private calendar link if you create one.</li>
        <li><strong>Sign-in sessions</strong>: a cookie that keeps you signed in. It is the only cookie, and it isn&apos;t used for anything else.</li>
      </ul>
      <h2>If someone invited you to a team</h2>
      <p>Until you sign up, you don&apos;t have an account: a team admin typed in your <strong>name and email address</strong>. Once you sign up with that address you join the team, and your posts on The Comb and your nickname are stored with it. We use them only to email you that team&apos;s tasks, reminders and weekly summary, and we keep a log of those emails (what was sent and when) so the owner can see it. Every email has a link to stop emails from that team.</p>
      <h2>Who processes the data</h2>
      <p>The app runs on <strong>Vercel</strong> (hosting), stores data with <strong>Neon</strong> (database), sends email through <strong>Resend</strong>, and offers sign-in with <strong>Google</strong>. They handle data only to provide those services. Nothing is sold or shared for advertising.</p>
      <h2>Deleting your data</h2>
      <p>Account holders can delete their goals, tasks and teams in the app. Deleting a team removes its roster and email log. To have your whole account or your email address removed, contact the developer through the links on the <a href="/developer">developer page</a>, and it will be done within 30 days.</p>
    </LegalPage>
  );
}
