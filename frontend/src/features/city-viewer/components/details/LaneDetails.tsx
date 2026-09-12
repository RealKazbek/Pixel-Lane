import { DetailRow } from "./DetailRow";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { Lane, Road } from "../../types/city";

interface LaneDetailsProps {
  lane: Lane;
  road: Road | undefined;
  analysis: AnalysisLookup;
}

export function LaneDetails({ lane, road, analysis }: LaneDetailsProps) {
  const metric = analysis.laneMetrics.get(lane.id);

  return (
    <div className="text-xs">
      <p className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Lane {lane.index} {road ? `· ${road.name}` : ""}
      </p>
      <DetailRow label="ID" value={lane.id.slice(0, 8)} />
      <DetailRow label="Road" value={road?.name ?? lane.road_id.slice(0, 8)} />
      <DetailRow label="Index" value={lane.index} />
      <DetailRow label="Direction" value={lane.direction} />
      <DetailRow label="Type" value={lane.lane_type} />
      {lane.speed_limit_kmh !== null && (
        <DetailRow label="Speed limit" value={`${lane.speed_limit_kmh} km/h`} />
      )}
      {metric ? (
        <>
          <DetailRow
            label="Capacity"
            value={`${metric.capacity_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label="Volume"
            value={`${metric.volume_vph.toFixed(0)} vph`}
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
