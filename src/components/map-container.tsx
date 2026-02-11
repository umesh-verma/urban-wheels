import { fetchLocations } from "@/lib/db/queries";
import { MapWrapper } from "./map-wrapper";

export async function MapContainer() {
  const locations = await fetchLocations();

  return <MapWrapper locations={locations} />;
}
