"use client";;
import { memo, useMemo } from "react";
import { useSunburstStable } from "./sunburst-context";

export function useSunburstBreadcrumbItems() {
  const { data, focus, focusById, rootId, zoomTo } = useSunburstStable();

  const items = useMemo(() => {
    const crumbs = [];
    let cur = focus;
    while (cur) {
      crumbs.unshift(cur);
      cur = cur.parentId ? focusById.get(cur.parentId) : undefined;
    }

    return crumbs.map((c, index) => ({
      id: c.id,
      label: c.id === rootId ? data.name : c.name,
      isCurrent: index === crumbs.length - 1,
    }));
  }, [data.name, focus, focusById, rootId]);

  return { items, zoomTo };
}

export const SunburstBreadcrumb = memo(function SunburstBreadcrumb({
  className,
  children
}) {
  return (
    <nav aria-label="Drill-down path" className={className ?? "mb-4"}>
      {children}
    </nav>
  );
});

SunburstBreadcrumb.displayName = "SunburstBreadcrumb";
