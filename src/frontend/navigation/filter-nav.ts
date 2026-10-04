import type {
  NavFooterItem,
  NavGroupItem,
  NavLeafItem,
  NavLinkItem,
  NavSectionItem,
} from "@/frontend/navigation/nav";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function linkMatchesQuery(link: NavLinkItem, normalizedQuery: string): boolean {
  if (link.label.toLowerCase().includes(normalizedQuery)) {
    return true;
  }
  return (
    link.children?.some((child) =>
      child.label.toLowerCase().includes(normalizedQuery),
    ) ?? false
  );
}

function filterLinkItem(
  link: NavLinkItem,
  normalizedQuery: string,
): NavLinkItem | null {
  const parentMatches = link.label.toLowerCase().includes(normalizedQuery);
  if (parentMatches) {
    return link;
  }
  const children = link.children?.filter((child) =>
    child.label.toLowerCase().includes(normalizedQuery),
  );
  if (children && children.length > 0) {
    return { ...link, children };
  }
  return null;
}

function leafMatchesQuery(item: NavLeafItem, normalizedQuery: string): boolean {
  if (item.type === "slot") {
    return true;
  }
  if (item.type === "link") {
    return linkMatchesQuery(item, normalizedQuery);
  }
  return item.label.toLowerCase().includes(normalizedQuery);
}

function filterLeafItem(
  item: NavLeafItem,
  normalizedQuery: string,
): NavLeafItem | null {
  if (item.type === "slot") {
    return item;
  }
  if (item.type === "link") {
    return filterLinkItem(item, normalizedQuery);
  }
  if (leafMatchesQuery(item, normalizedQuery)) {
    return item;
  }
  return null;
}

function filterGroup(
  group: NavGroupItem,
  normalizedQuery: string,
): NavGroupItem | null {
  const items = group.items
    .map((item) => filterLeafItem(item, normalizedQuery))
    .filter((item): item is NavLeafItem => item !== null);
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
