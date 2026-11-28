"use client";
import { useEffect } from "react";

const SEL = 'input[type="date"], input[type="time"], input[type="datetime-local"]';
const mark = (el: Element) => { if (el instanceof HTMLInputElement) el.toggleAttribute("data-empty", !el.value); };

/** Marks empty date and time boxes (data-empty) so CSS can show "Pick a date" where phones show a blank box. */
export function FieldHints() {
  useEffect(() => {
    const all = () => document.querySelectorAll(SEL).forEach(mark);
    const on = (e: Event) => { if (e.target instanceof Element && e.target.matches(SEL)) mark(e.target); };
    all();
    const mo = new MutationObserver(all); // shortcut: rescans on any DOM change; fine at this page size
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", on, true); document.addEventListener("change", on, true); document.addEventListener("reset", () => setTimeout(all), true);
    return () => { mo.disconnect(); document.removeEventListener("input", on, true); document.removeEventListener("change", on, true); };
  }, []);
  return null;
}
