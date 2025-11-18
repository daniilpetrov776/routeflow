import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MapContainer } from "@/components/map-container";
import { RouteSidebar } from "@/components/route-sidebar";
import { useYandexMaps } from "@/hooks/use-yandex-maps";
import styles from "./home.module.css";

export default function Home() {
  const { startingPoint, destinations } = useSelector(
    (state: RootState) => state.route
  );
  
  const { isLoaded } = useYandexMaps();

  useEffect(() => {
    document.title = "Планировщик маршрутов - Yandex Maps";
  }, []);

  return (
    <div className={styles.home}>
      <RouteSidebar />
      <MapContainer 
        isLoaded={isLoaded}
        startingPoint={startingPoint}
        destinations={destinations}
      />
    </div>
  );
}
