import { IntersectionDetails } from "./IntersectionDetails";
import { RoadDetails } from "./RoadDetails";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { MapSelection } from "../../map/types";
import type { City } from "../../types/city";

interface DetailsPanelProps {
  city: City;
  analysis: AnalysisLookup;
  /** The panel is only ever mounted by `CityViewerApp` once something is
   * selected -- see its "contextual inspector" block -- so a null
   * selection here would indicate a caller bug rather than a normal
   * empty state. */
  selected: MapSelection;
}

export function DetailsPanel({ city, analysis, selected }: DetailsPanelProps) {
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
