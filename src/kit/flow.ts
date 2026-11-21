import { useEffect } from "react";

// WearInterval-style scroll choreography for the marketing pages: section headings (with the label above and the
// paragraphs below) and the items of every card grid fade, rise and sharpen into place one after another.
// Only a data attribute and a CSS variable are set, so React state and markup are never disturbed.
const reduced = () => typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SKIP = "header, footer, form, nav, [role='tablist'], [aria-hidden='true'], svg, table, [data-noflow], [data-fx-skip]";
const INLINE = ["BUTTON", "A", "INPUT", "LABEL", "SELECT", "OPTION", "SPAN", "B", "I", "EM", "SMALL", "svg"];

function tag(main: Element, io: IntersectionObserver, found: HTMLElement[]) {
  const add = (el: Element | null, d: number) => {
    if (!el || !(el instanceof HTMLElement) || el.hasAttribute("data-fx") || el.closest(SKIP) || el.closest("[data-fx]")) return;
    el.setAttribute("data-fx", "wait");
    el.style.setProperty("--fx-d", `${d}ms`);
    found.push(el);
    io.observe(el);
  };
  const h1 = main.querySelector("h1");
  if (h1 && !h1.querySelector(".fx-w")) {
    let d = 0;
    const prev = h1.previousElementSibling;
    if (prev && (prev.textContent ?? "").trim().length < 80) { add(prev, d); d += 80; }
    add(h1, d); d += 120;
    let n = h1.nextElementSibling; let k = 0;
    while (n && k < 2 && ["P", "DIV"].includes(n.tagName) && !n.querySelector("form, img")) { add(n, d); d += 100; n = n.nextElementSibling; k += 1; }
  }
  main.querySelectorAll("section h2").forEach((h) => {
    let d = 0;
    const prev = h.previousElementSibling;
    if (prev && (prev.textContent ?? "").trim().length < 80 && !prev.querySelector("h2, img")) { add(prev, d); d += 80; }
    add(h, d); d += 110;
    let n = h.nextElementSibling; let k = 0;
    while (n && k < 3 && ["P", "UL", "OL", "DL"].includes(n.tagName)) { add(n, d); d += 90; n = n.nextElementSibling; k += 1; }
  });
  main.querySelectorAll("section *").forEach((box) => {
    if (box.closest(SKIP) || box.children.length < 2 || box.children.length > 16) return;
    const cs = getComputedStyle(box);
    const grid = cs.display === "grid" || (cs.display === "flex" && cs.flexWrap === "wrap");
    if (!grid) return;
    const kids = [...box.children].filter((c) => !INLINE.includes(c.tagName));
    if (kids.length < 2 || kids.some((c) => c.hasAttribute("data-fx") || c.querySelector("[data-fx], section"))) return;
    kids.forEach((c, i) => {
      add(c, (i % 6) * 85);
      const cs2 = getComputedStyle(c);
      if (parseFloat(cs2.borderTopWidth) > 0 && parseFloat(cs2.borderTopLeftRadius) > 0 && !c.querySelector("a, button")) c.setAttribute("data-fx-card", "");
      else if (parseFloat(cs2.borderTopWidth) > 0 && parseFloat(cs2.borderTopLeftRadius) > 0) c.setAttribute("data-fx-card", "");
    });
  });
}

/** Scrolls to the URL's #hash once the lazily loaded page has rendered (e.g. "Request a demo" → /#demo). */
function scrollToHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  let tries = 0;
  const go = () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); else if (tries++ < 20) window.setTimeout(go, 100); };
  window.setTimeout(go, 60);
}

export function useFlow(key: string) {
  useEffect(() => {
    scrollToHash();
    if (reduced() || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("fx-flow");
    const main = document.querySelector("main");
    if (!main) return;
    const found: HTMLElement[] = [];
    const settle = (el: HTMLElement) => window.setTimeout(() => el.setAttribute("data-fx", "done"), 1400 + (parseFloat(el.style.getPropertyValue("--fx-d")) || 0));
    const show = (el: HTMLElement) => { if (el.getAttribute("data-fx") === "wait") { el.setAttribute("data-fx", "in"); settle(el); } };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target as HTMLElement); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    // Pages load lazily, so keep tagging briefly while the route's content mounts.
    let pending = 0;
    const rescan = () => { if (!pending) pending = window.setTimeout(() => { pending = 0; tag(main, io, found); sweep(); }, 60); };
    const mo = new MutationObserver(rescan);
    mo.observe(main, { childList: true, subtree: true });
    const stopMo = window.setTimeout(() => mo.disconnect(), 4000);
    let raf = 0;
    const sweep = () => { raf = 0; found.forEach((el) => { if (el.getAttribute("data-fx") === "wait" && el.getBoundingClientRect().top < window.innerHeight) { show(el); io.unobserve(el); } }); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sweep); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const spot = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.("[data-fx-card]") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", spot, { passive: true });
    tag(main, io, found);
    const late = window.setTimeout(sweep, 350);
    return () => {
      io.disconnect(); mo.disconnect(); window.clearTimeout(stopMo); window.clearTimeout(late); window.clearTimeout(pending);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("pointermove", spot); cancelAnimationFrame(raf);
      found.forEach((el) => el.setAttribute("data-fx", "done"));
    };
  }, [key]);
}
