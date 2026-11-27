"use server";
import { setDone } from "@/lib/teammate";

export async function markDone(token: string) { return setDone(token, true); }
export async function undoDone(token: string) { return setDone(token, false); }
