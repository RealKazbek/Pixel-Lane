import { useTranslations } from "next-intl";
import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";
import { roadLengthMeters } from "../../map/adapters/geometryLength";
import { congestionToTrafficLevel } from "../../lib/traffic-level";
import { DetailRow } from "./DetailRow";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type { CoordinateSystem, Road } from "../../types/city";

interface RoadDetailsProps {
  road: Road;
  coordinateSystem: CoordinateSystem;
  analysis: AnalysisLookup;
}

export function RoadDetails({
  road,
  coordinateSystem,
  analysis,
}: RoadDetailsProps) {
  const t = useTranslations("cityModel.details");
  const length = roadLengthMeters(road, coordinateSystem);
  const metric = analysis.roadMetrics.get(road.id);

  return (
    <div className="text-xs">
      <p className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {road.name}
      </p>
      <DetailRow label={t("id")} value={road.id.slice(0, 8)} />
      <DetailRow label={t("roadType")} value={road.road_type} />
      <DetailRow label={t("length")} value={`${length.toFixed(0)} m`} />
      <DetailRow label={t("laneCount")} value={road.lanes.length} />
      <DetailRow
        label={t("speedLimit")}
        value={`${road.default_speed_limit_kmh} km/h`}
      />
      {metric ? (
        <>
          <DetailRow
            label={t("trafficVolume")}
            value={`${metric.volume_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label={t("capacity")}
            value={`${metric.capacity_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label={t("vcRatio")}
            value={metric.volume_capacity_ratio.toFixed(2)}
          />
          <DetailRow
            label={t("congestion")}
            value={
              <TrafficLevelBadge
                level={congestionToTrafficLevel(metric.congestion_level)}
              />
            }
          />
        </>
      ) : (
        <p className="mt-1.5 text-zinc-400">{t("runAnalysisHint")}</p>
      )}
    </div>
  );
}
