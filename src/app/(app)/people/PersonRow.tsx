import Link from "next/link";
import { HexBadge } from "@/components/app/HexBadge";
import { FollowButton } from "./FollowButton";

export type PersonT = { id: string; name: string; bio: string | null; avatar: string | null; following: boolean; isMe: boolean };

export function PersonRow({ p: raw }: { p: PersonT }) {
  const p = { ...raw, name: raw.name.trim() || "Unnamed member" };
  return (
    <li className="flex items-center gap-3 p-3 sm:p-4">
      <Link href={p.isMe ? "/profile" : `/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] hover:bg-raised/60">
        {p.avatar
          // eslint-disable-next-line @next/next/no-img-element -- small, already-resized image from our own route
          ? <img src={p.avatar} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full border-2 border-accent object-cover" />
          : <span className="grid size-12 shrink-0 place-items-center"><HexBadge label={p.name} color="#F5B80B" size={44} /></span>}
        <span className="min-w-0">
          <span className="block truncate font-semibold">{p.name}{p.isMe && <span className="font-normal text-muted"> (you)</span>}</span>
          {p.bio && <span className="block truncate text-sm text-muted">{p.bio}</span>}
        </span>
      </Link>
      {!p.isMe && <FollowButton userId={p.id} name={p.name} initial={p.following} size="sm" />}
    </li>
  );
}
