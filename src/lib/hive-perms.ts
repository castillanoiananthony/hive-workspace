// "Hive control": what a team member is allowed to do. The admin (leader) always has every power.
export const PERMS = [
  { key: "post", label: "Post on The Comb", hint: "Share updates with the team" },
  { key: "vault", label: "Add to the Hive Vault", hint: "Share Drive folders, GitHub repos and other links, and tidy them up" },
  { key: "nicknames", label: "Edit nicknames", hint: "Change anyone's nickname in this team" },
  { key: "tasks", label: "Create & assign tasks", hint: "Make team tasks, choose who does them, edit them" },
  { key: "members", label: "Manage members", hint: "Invite people, share the join link, remove members" },
  { key: "hierarchy", label: "Edit hierarchy & roles", hint: "Move people in the chart and change their roles" },
  { key: "templates", label: "Manage templates", hint: "Save, reuse and schedule repeating tasks" },
  { key: "log", label: "See the email log", hint: "Who was emailed what, and when" },
  { key: "settings", label: "Change team settings", hint: "Team name, colour and weekly digest" },
] as const;

export type Perm = (typeof PERMS)[number]["key"];
export const ALL_PERMS = PERMS.map((p) => p.key) as Perm[];
export const DEFAULT_PERMS: Perm[] = ["post"]; // a new member can talk on The Comb, nothing else

export const can = (who: { isAdmin: boolean; perms: string[] } | null | undefined, perm: Perm) => Boolean(who && (who.isAdmin || who.perms.includes(perm)));
