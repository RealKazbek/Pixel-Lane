import { IntersectionDetails } from "./IntersectionDetails";
import { LaneDetails } from "./LaneDetails";
import { RoadDetails } from "./RoadDetails";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { ProjectedCity } from "../../lib/project-city";
import type { SelectedEntity } from "../../state/selection";
import type { City } from "../../types/city";

interface DetailsPanelProps {
  city: City;
  projected: ProjectedCity;
  analysis: AnalysisLookup;
  selected: SelectedEntity | null;
}

export function DetailsPanel({
  city,
  projected,
  analysis,
  selected,
}: DetailsPanelProps) {
  if (!selected) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Click a road, lane, or intersection to see its details here.
      </p>
    );
  }

  if (selected.type === "road") {
    const road = city.roads.find((r) => r.id === selected.id);
    if (!road) return null;
    return (
      <RoadDetails road={road} projected={projected} analysis={analysis} />
    );
  }

  if (selected.type === "lane") {
    const road = city.roads.find((r) =>
      r.lanes.some((l) => l.id === selected.id),
    );
    const lane = road?.lanes.find((l) => l.id === selected.id);
    if (!lane) return null;
    return <LaneDetails lane={lane} road={road} analysis={analysis} />;
  }

  const intersection = city.intersections.find((i) => i.id === selected.id);
  if (!intersection) return null;
  return (
    <IntersectionDetails intersection={intersection} analysis={analysis} />
  );
}
