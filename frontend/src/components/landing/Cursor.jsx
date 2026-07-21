import { useEffect, useState } from "react";

/**
 * Custom mix-blend-difference dot cursor.
 * Grows subtly on hover over data-cursor-hover elements.
 */
export default function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;

    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    const onOver = (e) => {
      const t = e.target;
      if (t?.closest?.("[data-cursor-hover], a, button")) setHover(true);
      else setHover(false);
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
      aria-hidden
      className={`cursor-dot ${hover ? "hover-active" : ""}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)` }}
    />
  );
}
