import { useTranslations } from "next-intl";
import { TrafficLevelBadge } from "@/components/ui/TrafficLevelBadge";
import { roadLengthMeters } from "../../map/adapters/geometryLength";
import { congestionToTrafficLevel } from "../../lib/traffic-level";
import { DetailRow } from "./DetailRow";
import type { AnalysisLookup } from "../../lib/analysis-lookup";
import type {
  CoordinateSystem,
  LaneCountQuality,
  Road,
} from "../../types/city";

interface RoadDetailsProps {
  road: Road;
  coordinateSystem: CoordinateSystem;
  analysis: AnalysisLookup;
}

/** i18n key suffix for each `LaneCountQuality` value (see
 * docs/city-model.md's Part 2A quality tiers). */
const QUALITY_LABEL_KEY: Record<LaneCountQuality, string> = {
  SOURCE: "qualitySource",
  INFERRED: "qualityInferred",
  FALLBACK: "qualityFallback",
  UNKNOWN: "qualityUnknown",
};

/** A road's own generated `lanes` never carries a BUS-typed lane unless
 * `bus:lanes`/`psv:lanes` source data said so -- never guessed (see
 * mapper.py's `_lane_type_for_index`). */
function hasBusLane(road: Road): boolean {
  return road.lanes.some((lane) => lane.lane_type === "BUS");
}

/** `NONE`/`UNKNOWN`/absent all mean "nothing to show" -- only a concrete
 * source-backed value (e.g. `PARALLEL`, `LANE`, `TRACK`) counts as real. */
function isRealValue(value: string | null | undefined): boolean {
  return !!value && value !== "NONE" && value !== "UNKNOWN";
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
      <DetailRow
        label={t("laneCount")}
        value={road.lanes.length || t("unknown")}
      />
      <DetailRow
        label={t("speedLimit")}
        value={
          road.default_speed_limit_kmh === null
            ? t("unknown")
            : `${road.default_speed_limit_kmh} km/h`
        }
      />
      {road.source_lane_count != null && (
        <DetailRow
          label={t("sourceLaneCount")}
          value={road.source_lane_count}
        />
      )}
      {road.forward_lane_count != null && (
        <DetailRow
          label={t("forwardLaneCount")}
          value={road.forward_lane_count}
        />
      )}
      {road.backward_lane_count != null && (
        <DetailRow
          label={t("backwardLaneCount")}
          value={road.backward_lane_count}
        />
      )}
      {road.lane_count_quality && (
        <DetailRow
          label={t("laneCountQuality")}
          value={t(QUALITY_LABEL_KEY[road.lane_count_quality])}
        />
      )}
      {hasBusLane(road) && <DetailRow label={t("busLane")} value={t("yes")} />}
      {isRealValue(road.parking_left) || isRealValue(road.parking_right) ? (
        <DetailRow label={t("parkingLane")} value={t("yes")} />
      ) : null}
      {isRealValue(road.cycleway_left) || isRealValue(road.cycleway_right) ? (
        <DetailRow label={t("cycleway")} value={t("yes")} />
      ) : null}
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
