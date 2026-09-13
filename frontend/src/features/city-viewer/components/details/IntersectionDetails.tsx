import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";
import { congestionToTrafficLevel } from "../../lib/traffic-level";
import { DetailRow } from "./DetailRow";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { Intersection } from "../../types/city";

interface IntersectionDetailsProps {
  intersection: Intersection;
  analysis: AnalysisLookup;
}

export function IntersectionDetails({
  intersection,
  analysis,
}: IntersectionDetailsProps) {
  const metric = analysis.intersectionMetrics.get(intersection.id);

  return (
    <div className="text-xs">
      <p className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Intersection
      </p>
      <DetailRow label="ID" value={intersection.id.slice(0, 8)} />
      <DetailRow label="Control" value={intersection.control_type} />
      <DetailRow
        label="Connected roads"
        value={intersection.connected_road_ids.length}
      />
      <DetailRow
        label="Connected lanes"
        value={intersection.connected_lane_ids.length}
      />
      <DetailRow
        label="Traffic light"
        value={intersection.traffic_light_id ? "Yes" : "No"}
      />
      {metric ? (
        <>
          <DetailRow
            label="Inbound volume"
            value={`${metric.inbound_volume_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label="Inbound capacity"
            value={`${metric.inbound_capacity_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label="V/C"
            value={metric.volume_capacity_ratio.toFixed(2)}
          />
          <DetailRow
            label="Congestion"
            value={
              <TrafficLevelBadge
                level={congestionToTrafficLevel(metric.congestion_level)}
                label={metric.congestion_level}
              />
            }
          />
        </>
      ) : (
        <p className="mt-1.5 text-zinc-400">
          Run Traffic Analysis to see volume/congestion.
        </p>
      )}
    </div>
  );
}
