"use server";
import { setSubscribed } from "@/lib/teammate";

export async function unsubscribe(token: string) { return setSubscribed(token, false); }
export async function resubscribe(token: string) { return setSubscribed(token, true); }
