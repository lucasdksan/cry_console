import type {
  NavFooterItem,
  NavGroupItem,
  NavLeafItem,
  NavSectionItem,
} from "@/frontend/navigation/nav";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function leafMatchesQuery(item: NavLeafItem, normalizedQuery: string): boolean {
  if (item.type === "slot") {
    return true;
  }
  return item.label.toLowerCase().includes(normalizedQuery);
}

function filterGroup(
  group: NavGroupItem,
  normalizedQuery: string,
): NavGroupItem | null {
  const items = group.items.filter((item) =>
    leafMatchesQuery(item, normalizedQuery),
  );
  if (items.length === 0) {
    return null;
  }
  return { ...group, items };
}

export function filterNavSections(
  sections: NavSectionItem[],
  query: string,
): NavSectionItem[] {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return sections;
  }

  const result: NavSectionItem[] = [];

  for (const section of sections) {
    if (section.type === "group") {
      const filtered = filterGroup(section, normalizedQuery);
      if (filtered) {
        result.push(filtered);
      }
      continue;
    }

    if (leafMatchesQuery(section, normalizedQuery)) {
      result.push(section);
    }
  }

  return result;
}

export function filterNavFooter(
  footer: NavFooterItem[],
  query: string,
): NavFooterItem[] {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return footer;
  }

  return footer.filter((item) => leafMatchesQuery(item, normalizedQuery));
}

export function navHasVisibleTargets(
  sections: NavSectionItem[],
  footer: NavFooterItem[],
): boolean {
  const hasSectionTarget = sections.some((section) => {
    if (section.type === "group") {
      return section.items.some((item) => item.type !== "slot");
    }
    return section.type !== "slot";
  });

  const hasFooterTarget = footer.some((item) => item.type !== "slot");

  return hasSectionTarget || hasFooterTarget;
}
