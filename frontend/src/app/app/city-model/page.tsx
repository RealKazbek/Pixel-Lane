import type { Metadata } from "next";
import { CityViewerApp } from "@/features/city-viewer/components/CityViewerApp";

export const metadata: Metadata = { title: "City Model" };

export default function Home() {
  return <CityViewerApp />;
}
