"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Counts pages visited in this tab, so Back knows whether there's an in-app page to go back to. */
export function NavTracker() {
  const path = usePathname();
  useEffect(() => { sessionStorage.setItem("hive-pages", String(Number(sessionStorage.getItem("hive-pages") ?? 0) + 1)); }, [path]);
  return null;
}
