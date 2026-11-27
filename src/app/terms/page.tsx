import type { Metadata } from "next";
import { LegalPage } from "@/components/app/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="27 November 2026">
      <p>HIVE-WORKSPACE is a free student project, offered as it is. By using it you agree to the points below.</p>
      <ul>
        <li><strong>Use it for planning and team reminders.</strong> Don&apos;t use it to send spam or messages people didn&apos;t ask for. Only add teammates who expect to hear from you.</li>
        <li><strong>Your content stays yours.</strong> We store it only to run the app for you.</li>
        <li><strong>No guarantees.</strong> We try to keep it running and to send reminders on time, but emails can be late or missed and the service can change or stop. Keep anything important somewhere else too.</li>
        <li><strong>Accounts can be closed</strong> if they are used to harm others or abuse the email features.</li>
        <li><strong>Privacy</strong> is explained on the <a href="/privacy">privacy page</a>.</li>
      </ul>
      <p>Questions? Use the links on the <a href="/developer">developer page</a>.</p>
    </LegalPage>
  );
}
