import { polylineLength } from "../../lib/lane-offset";
import { DetailRow } from "./DetailRow";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { ProjectedCity } from "../../lib/project-city";
import type { Road } from "../../types/city";

interface RoadDetailsProps {
  road: Road;
  projected: ProjectedCity;
  analysis: AnalysisLookup;
}

export function RoadDetails({ road, projected, analysis }: RoadDetailsProps) {
  const points = projected.roads.find((r) => r.id === road.id)?.points ?? [];
  const length = polylineLength(points);
  const metric = analysis.roadMetrics.get(road.id);

  return (
    <div className="text-xs">
      <p className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {road.name}
      </p>
      <DetailRow label="ID" value={road.id.slice(0, 8)} />
      <DetailRow label="Type" value={road.road_type} />
      <DetailRow label="Length" value={`${length.toFixed(0)} m`} />
      <DetailRow label="Lane count" value={road.lanes.length} />
      <DetailRow
        label="Speed limit"
        value={`${road.default_speed_limit_kmh} km/h`}
      />
      {metric ? (
        <>
          <DetailRow
            label="Traffic volume"
            value={`${metric.volume_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label="Capacity"
            value={`${metric.capacity_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label="V/C"
            value={metric.volume_capacity_ratio.toFixed(2)}
          />
          <DetailRow label="Congestion" value={metric.congestion_level} />
        </>
      ) : (
        <p className="mt-1.5 text-zinc-400">
          Run Traffic Analysis to see volume/congestion.
        </p>
      )}
    </div>
  );
}
