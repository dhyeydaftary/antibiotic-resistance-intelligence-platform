import { useEffect, useRef } from "react";

/**
 * Custom mix-blend-difference dot cursor.
 * Grows subtly on hover over data-cursor-hover elements.
 *
 * Position is written straight to the DOM via a ref on every mousemove,
 * NOT through React state — a setState here would re-render this component
 * on every single pixel of mouse movement (60-120+ times/sec), which is the
 * actual cause of felt lag on this page. Direct style mutation costs nothing
 * extra: the browser was already going to repaint for the cursor to move.
 */
export default function Cursor() {
  const dotRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;

    const onMove = (e) => {
      const el = dotRef.current;
      if (!el) return;
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    };
    const onOver = (e) => {
      const el = dotRef.current;
      if (!el) return;
      const t = e.target;
      const isHover = !!t?.closest?.("[data-cursor-hover], a, button");
      el.classList.toggle("hover-active", isHover);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="cursor-dot"
      style={{ transform: "translate(-100px, -100px) translate(-50%,-50%)" }}
    />
  );
}
