import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MapContainer } from "@/components/map/map-container";
import { RouteSidebar } from "@/components/route/route-sidebar";
import { RoutePersistence } from "@/components/route/route-persistence";
import { useYandexMaps } from "@/hooks/use-yandex-maps";
import { useIsMobile } from "@/hooks/use-mobile";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";
import styles from "./home.module.css";

export default function Home() {
  const { startingPoint, destinations } = useSelector(
    (state: RootState) => state.route
  );
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { isLoaded } = useYandexMaps();
  
  // Создаем refs для map
  const yandexMapRef = useRef<YandexMap | null>(null);
  const routesRef = useRef<YandexMultiRoute[]>([]);

  useEffect(() => {
    document.title = "Планировщик маршрутов - Yandex Maps";
  }, []);

  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={styles.home}>
      <RoutePersistence />
      {isMobile && (
        <div 
          className={`${styles["home__overlay"]} ${sidebarOpen ? styles["home__overlay--visible"] : ""}`}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      <RouteSidebar onOpenChange={setSidebarOpen} />
      <MapContainer 
        isLoaded={isLoaded}
        startingPoint={startingPoint}
        destinations={destinations}
        yandexMapRef={yandexMapRef}
        routesRef={routesRef}
      />
    </div>
  );
}
