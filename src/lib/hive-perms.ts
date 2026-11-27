// "Hive control": what a team member is allowed to do. The admin (leader) always has every power.
export const PERMS = [
  { key: "post", label: "Post on The Comb", hint: "Share updates with the team" },
  { key: "hide", label: "Hide posts on The Comb", hint: "Hide announcements from the team and see the hidden ones" },
  { key: "vault", label: "Add to the Hive Vault", hint: "Share Drive folders, GitHub repos and other links, and tidy them up" },
  { key: "nicknames", label: "Edit nicknames", hint: "Change anyone's nickname in this team" },
  { key: "tasks", label: "Create & assign tasks", hint: "Make team tasks, choose who does them, edit them" },
  { key: "members", label: "Manage members", hint: "Invite people, share the join link, remove members" },
  { key: "hierarchy", label: "Edit hierarchy", hint: "Move people around in the team chart" },
  { key: "templates", label: "Manage templates", hint: "Save, reuse and schedule repeating tasks" },
  { key: "log", label: "See the email log", hint: "Who was emailed what, and when" },
  { key: "settings", label: "Change team settings", hint: "Team name, colour and weekly digest" },
] as const;

export type Perm = (typeof PERMS)[number]["key"];
export const ALL_PERMS = PERMS.map((p) => p.key) as Perm[];
export const DEFAULT_PERMS: Perm[] = ["post", "vault"]; // a plain member: talk on The Comb and share links

/** Role presets offered when making a team. Slot 1 is the Leader (the admin), slot 2 gets the second set, the rest the third. */
export const ROLE_PRESETS = [
  { id: "team", label: "Leader, Co-lead, Assistant", roles: ["Leader", "Co-lead", "Assistant"] },
  { id: "class", label: "Class group", roles: ["Leader", "Secretary", "Treasurer"] },
  { id: "project", label: "Project", roles: ["Project lead", "Developer", "Designer"] },
  { id: "none", label: "Leader only", roles: ["Leader"] },
] as const;
export const SECOND_PERMS: Perm[] = ["post", "hide", "vault", "nicknames", "tasks", "members", "hierarchy", "templates", "log"];
export const OTHER_PERMS: Perm[] = ["post", "vault", "tasks", "templates"];
export const presetPerms = (i: number): Perm[] => (i === 0 ? ALL_PERMS : i === 1 ? SECOND_PERMS : OTHER_PERMS);

export const can = (who: { isAdmin: boolean; perms: string[] } | null | undefined, perm: Perm) => Boolean(who && (who.isAdmin || who.perms.includes(perm)));
