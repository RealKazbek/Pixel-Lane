import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslations } from "next-intl";
import { IntersectionDetails } from "./IntersectionDetails";
import { RoadDetails } from "./RoadDetails";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { MapSelection } from "../../map/types";
import type { City } from "../../types/city";

interface DetailsPanelProps {
  city: City;
  analysis: AnalysisLookup;
  selected: MapSelection | null;
}

export function DetailsPanel({ city, analysis, selected }: DetailsPanelProps) {
  const t = useTranslations("cityModel.details");
  if (!selected) {
    return <EmptyState title={t("clickToSeeDetails")} />;
  }

  if (selected.type === "road") {
    const road = city.roads.find((r) => r.id === selected.id);
    if (!road) return null;
    return (
      <RoadDetails
        road={road}
        coordinateSystem={city.coordinate_system}
        analysis={analysis}
      />
    );
  }

  const intersection = city.intersections.find((i) => i.id === selected.id);
  if (!intersection) return null;
  return (
    <IntersectionDetails intersection={intersection} analysis={analysis} />
  );
}
