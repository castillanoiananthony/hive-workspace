export type TeamT = { id: string; name: string; color: string; digestEnabled: boolean; digestDay: number; joinCode: string | null; app: string; importanceColors: Record<string, string> | null; kind?: string; archived?: string | null };
export type HiveMilestoneT = { id: string; title: string; dueAt: string | null; hasTime: boolean; done: boolean; date: string | null; time: string | null; label: string | null };
export type ChecklistT = { id: string; title: string; items: { id: string; text: string; ownerId: string | null; done: boolean; doneBy: string | null }[] };
export type MemberT = { id: string; userId: string | null; name: string; nickname: string | null; email: string | null; joined: boolean; isAdmin: boolean; roleId: string | null; perms: string[]; parentId: string | null; position: number; avatar: string | null; unsubscribed: boolean; access?: string; streams?: string[]; working?: string | null; workingNote?: string | null };
export type StreamTagT = { id: string; name: string; color: string };
export type NoteT = { id: string; memberId: string | null; body: string; at: string; label: string; taskIds: string[] };
export type CriterionT = { id: string; text: string; taskIds: string[] };
export type RoleT = { id: string; name: string; perms: string[]; isLeader: boolean };
export type MeT = { memberId: string; isAdmin: boolean; perms: string[]; access?: string; subtasks?: number };
export type TaskT = { id: string; title: string; status: "todo" | "doing" | "review" | "done"; dueAt: string | null; hasTime: boolean; importance: number; type?: string; streamId?: string | null; subtasks?: { done: number; total: number }; links?: number };
export type AssignedT = { taskId: string; memberId: string; doneAt: string | null; progress: number };
export type LogT = { id: string; taskId: string; memberId: string; progress: number; done: boolean; note: string | null; at: string };
export type StreamT =
  | { kind: "post"; id: string; at: string; memberId: string | null; body: string; hidden: boolean }
  | { kind: "done"; id: string; at: string; memberId: string | null; taskId: string }
  | { kind: "task"; id: string; at: string; memberId: null; taskId: string };

export const nameOf = (m: { nickname: string | null; name: string }) => m.nickname?.trim() || m.name;
export const has = (me: MeT, perm: string) => me.isAdmin || ((me.access ?? "member") === "member" && me.perms.includes(perm));
export type ContributionT = { id: string; memberId: string | null; kind: string; what: string; at: string };
