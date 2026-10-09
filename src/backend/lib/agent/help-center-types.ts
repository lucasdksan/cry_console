export const HELP_CENTER_SOURCES = [
  "tutorials",
  "tracks",
  "faq",
  "known-issues",
  "troubleshooting",
  "announcements",
] as const;

export type HelpCenterSource = (typeof HELP_CENTER_SOURCES)[number];

export type HelpCenterSectionSeed = {
  url: string;
  source: HelpCenterSource;
};

export const VTEX_HELP_SECTION_SEEDS: HelpCenterSectionSeed[] = [
  {
    url: "https://help.vtex.com/pt/docs/tutorials",
    source: "tutorials",
  },
  {
    url: "https://help.vtex.com/pt/docs/tracks",
    source: "tracks",
  },
  { url: "https://help.vtex.com/pt/faq", source: "faq" },
  {
    url: "https://help.vtex.com/pt/known-issues",
    source: "known-issues",
  },
  {
    url: "https://help.vtex.com/pt/troubleshooting",
    source: "troubleshooting",
  },
  {
    url: "https://help.vtex.com/pt/announcements",
    source: "announcements",
  },
];

export type HelpCenterDiscoveredLink = {
  url: string;
  label: string;
  source: HelpCenterSource;
};

export type HelpCenterPageDocument = {
  url: string;
  title: string;
  section: string | null;
  text: string;
  source: HelpCenterSource;
};

export type HelpCenterChunk = {
  id: string;
  url: string;
  title: string;
  section?: string;
  content: string;
  source: HelpCenterSource;
};

export type HelpCenterPineconeMetadata = {
  url: string;
  title: string;
  section: string;
  content: string;
  source: HelpCenterSource;
};
