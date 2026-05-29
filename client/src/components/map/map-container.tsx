import { MapControls } from "./map-controls";
import { MapLoadingState } from "./map-loading-state";
import { MapCalculatingState } from "./map-calculating-state";
import { MapPlacementMode } from "./map-placement-mode";
import { MapPlacementContextMenu } from "./map-placement-context-menu";
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
        className={`${styles["map-container__map"]} ${
          !map.isMobile && map.mapPlacementMode !== "idle"
            ? styles["map-container__map--placing"]
            : ""
        }`}
        style={{ minHeight: "100%" }}
      />

      {!isLoaded && <MapLoadingState />}

      {map.isCalculating && <MapCalculatingState />}

      <MapPlacementMode />

      <MapPlacementContextMenu
        open={map.longPressPlacement.menuState.open}
        anchor={map.longPressPlacement.menuState.anchor}
        coords={map.longPressPlacement.menuState.coords}
        destinationsCount={map.longPressPlacement.destinationsCount}
        isBusy={map.longPressPlacement.isApplying}
        onSelectStart={map.longPressPlacement.handleSelectStart}
        onSelectDestination={map.longPressPlacement.handleSelectDestination}
        onClose={map.longPressPlacement.closeMenu}
      />

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
