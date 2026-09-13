export interface NavItem {
  href: string;
  label: string;
  /** Real, functional screens have no status; everything else is
   * explicitly marked so it's never mistaken for working functionality. */
  status?: "planned";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/city-model", label: "City Model" },
  { href: "/traffic", label: "Traffic", status: "planned" },
  { href: "/infrastructure", label: "Infrastructure", status: "planned" },
  { href: "/simulation", label: "Simulation", status: "planned" },
  { href: "/analytics", label: "Analytics", status: "planned" },
  { href: "/incidents", label: "Incidents", status: "planned" },
  {
    href: "/emergency-priority",
    label: "Emergency Priority",
    status: "planned",
  },
  { href: "/settings", label: "Settings", status: "planned" },
];
