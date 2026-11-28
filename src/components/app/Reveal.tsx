"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Children rise in once, staggered, when the group scrolls into view. Content stays visible if JavaScript never runs. */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: no hide-then-show flash
    el.dataset.reveal = "armed";
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.reveal = "in"; io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}
