import { useTranslations } from "next-intl";
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
  const t = useTranslations("cityModel.details");
  const metric = analysis.intersectionMetrics.get(intersection.id);

  return (
    <div className="text-xs">
      <p className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {t("intersectionHeading")}
      </p>
      <DetailRow label={t("id")} value={intersection.id.slice(0, 8)} />
      <DetailRow label={t("control")} value={intersection.control_type} />
      <DetailRow
        label={t("connectedRoads")}
        value={intersection.connected_road_ids.length}
      />
      <DetailRow
        label={t("connectedLanes")}
        value={intersection.connected_lane_ids.length}
      />
      <DetailRow
        label={t("trafficLight")}
        value={intersection.traffic_light_id ? t("yes") : t("no")}
      />
      {metric ? (
        <>
          <DetailRow
            label={t("inboundVolume")}
            value={`${metric.inbound_volume_vph.toFixed(0)} vph`}
          />
          <DetailRow
            label={t("inboundCapacity")}
            value={`${metric.inbound_capacity_vph.toFixed(0)} vph`}
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
