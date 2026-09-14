import { RoadLabApp } from "@/features/city-viewer/dev/roadLab/RoadLabApp";

export const metadata = {
  title: "Road Geometry Lab",
  robots: { index: false, follow: false },
};

export default function RoadLabPage() {
  return <RoadLabApp />;
}
