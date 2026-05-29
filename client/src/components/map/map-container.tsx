import { MapControls } from "./map-controls";
import { MapLoadingState } from "./map-loading-state";
import { MapCalculatingState } from "./map-calculating-state";
import { RouteBalloon } from "../route/route-balloon";
import { useMapContainer } from "@/hooks/useMapContainer";
import type { AddressPoint } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";
import styles from "./map-container.module.css";

interface MapContainerProps {
  isLoaded: boolean;
  startingPoint: AddressPoint | null;
  destinations: AddressPoint[];
  yandexMapRef: React.MutableRefObject<YandexMap | null>;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
}

export function MapContainer({
  isLoaded,
  startingPoint,
  destinations,
  yandexMapRef,
  routesRef,
}: MapContainerProps) {
  const map = useMapContainer({
    isLoaded,
    startingPoint,
    destinations,
    yandexMapRef,
    routesRef,
  });

  return (
    <div className={styles["map-container"]} onClick={map.handleMapClick}>
      <div
        ref={map.mapRef}
        className={styles["map-container__map"]}
        style={{ minHeight: "100%" }}
      />

      {!isLoaded && <MapLoadingState />}

      {map.isCalculating && <MapCalculatingState />}

      <MapControls
        onZoomIn={map.handleZoomIn}
        onZoomOut={map.handleZoomOut}
        onCenter={map.handleCenter}
      />

      <RouteBalloon
        data={map.balloon.data}
        position={map.balloon.position}
        onClose={map.closeBalloon}
      />
    </div>
  );
}
