import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MapContainer } from "@/components/map-container";
import { RouteSidebar } from "@/components/route-sidebar";
import { useYandexMaps } from "@/hooks/use-yandex-maps";

export default function Home() {
  const { routes, startingPoint, destinations } = useSelector(
    (state: RootState) => state.route
  );
  
  const { isLoaded } = useYandexMaps();

  useEffect(() => {
    document.title = "Планировщик маршрутов - Yandex Maps";
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <RouteSidebar />
      <MapContainer 
        isLoaded={isLoaded}
        routes={routes}
        startingPoint={startingPoint}
        destinations={destinations}
      />
    </div>
  );
}
