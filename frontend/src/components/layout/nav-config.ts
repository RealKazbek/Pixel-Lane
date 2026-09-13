export interface NavItem {
  href: string;
  label: string;
  /** Real, functional screens have no status; everything else is
   * explicitly marked so it's never mistaken for working functionality. */
  status?: "planned";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/app", label: "Dashboard" }],
  },
  {
    label: "City Operations",
    items: [
      { href: "/app/city-model", label: "City Model" },
      { href: "/app/traffic", label: "Traffic", status: "planned" },
      {
        href: "/app/infrastructure",
        label: "Infrastructure",
        status: "planned",
      },
    ],
  },
  {
    label: "Simulation",
    items: [
      { href: "/app/simulation", label: "Simulation", status: "planned" },
      { href: "/app/analytics", label: "Analytics", status: "planned" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/app/incidents", label: "Incidents", status: "planned" },
      {
        href: "/app/emergency-priority",
        label: "Emergency Priority",
        status: "planned",
      },
    ],
  },
  {
    label: "System",
    items: [{ href: "/app/settings", label: "Settings", status: "planned" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
