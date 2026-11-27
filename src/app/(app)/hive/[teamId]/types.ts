export type TeamT = { id: string; name: string; color: string; digestEnabled: boolean; digestDay: number; joinCode: string | null; app: string; importanceColors: Record<string, string> | null };
export type MemberT = { id: string; name: string; nickname: string | null; email: string | null; joined: boolean; isAdmin: boolean; roleId: string | null; perms: string[]; parentId: string | null; position: number; avatar: string | null; unsubscribed: boolean };
export type RoleT = { id: string; name: string; perms: string[]; isLeader: boolean };
export type MeT = { memberId: string; isAdmin: boolean; perms: string[] };
export type TaskT = { id: string; title: string; status: "todo" | "doing" | "done"; dueAt: string | null; hasTime: boolean; importance: number };
export type AssignedT = { taskId: string; memberId: string; doneAt: string | null };
export type StreamT =
  | { kind: "post"; id: string; at: string; memberId: string | null; body: string; hidden: boolean }
  | { kind: "done"; id: string; at: string; memberId: string | null; taskId: string }
  | { kind: "task"; id: string; at: string; memberId: null; taskId: string };

export const nameOf = (m: { nickname: string | null; name: string }) => m.nickname?.trim() || m.name;
export const has = (me: MeT, perm: string) => me.isAdmin || me.perms.includes(perm);
