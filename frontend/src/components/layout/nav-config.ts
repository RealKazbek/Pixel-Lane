export interface NavItem {
  href: string;
  /** Key under the `common.nav` translation namespace. */
  labelKey:
    | "dashboard"
    | "cityModel"
    | "traffic"
    | "infrastructure"
    | "simulation"
    | "analytics"
    | "incidents"
    | "emergencyPriority"
    | "settings";
  /** Real, functional screens have no status; everything else is
   * explicitly marked so it's never mistaken for working functionality. */
  status?: "planned";
}

export interface NavGroup {
  /** Key under the `common.nav` translation namespace. */
  labelKey:
    | "groupOverview"
    | "groupCityOperations"
    | "groupSimulation"
    | "groupOperations"
    | "groupSystem";
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "groupOverview",
    items: [{ href: "/app", labelKey: "dashboard" }],
  },
  {
    labelKey: "groupCityOperations",
    items: [
      { href: "/app/city-model", labelKey: "cityModel" },
      { href: "/app/traffic", labelKey: "traffic", status: "planned" },
      {
        href: "/app/infrastructure",
        labelKey: "infrastructure",
        status: "planned",
      },
    ],
  },
  {
    labelKey: "groupSimulation",
    items: [
      { href: "/app/simulation", labelKey: "simulation", status: "planned" },
      { href: "/app/analytics", labelKey: "analytics", status: "planned" },
    ],
  },
  {
    labelKey: "groupOperations",
    items: [
      { href: "/app/incidents", labelKey: "incidents", status: "planned" },
      {
        href: "/app/emergency-priority",
        labelKey: "emergencyPriority",
        status: "planned",
      },
    ],
  },
  {
    labelKey: "groupSystem",
    items: [{ href: "/app/settings", labelKey: "settings", status: "planned" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
