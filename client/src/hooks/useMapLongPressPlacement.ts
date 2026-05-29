import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  applyDestinationAtCoords,
  applyStartingPointAtCoords,
} from "@/lib/map-container/apply-map-placement";
import { attachMapLongPress, type MapLongPressPayload } from "@/lib/map-container/map-long-press";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { RootState } from "@/store";
import {
  addDestination,
  setMapPlacementMode,
  setStartingPoint,
  type AddressPoint,
} from "@/store/route-slice";
import type { Coordinates, YandexMap } from "@/types/yandex-maps";
import type { MapPlacementContextMenuAnchor } from "@/components/map/map-placement-context-menu";

export interface MapLongPressMenuState {
  open: boolean;
  coords: Coordinates | null;
  anchor: MapPlacementContextMenuAnchor | null;
}

const CLOSED_MENU_STATE: MapLongPressMenuState = {
  open: false,
  coords: null,
  anchor: null,
};

export function useMapLongPressPlacement(
  yandexMapRef: React.MutableRefObject<YandexMap | null>,
  isLoaded: boolean
) {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const startingPoint = useSelector((state: RootState) => state.route.startingPoint);
  const destinations = useSelector((state: RootState) => state.route.destinations);

  const startingPointRef = useRef(startingPoint);
  const destinationsRef = useRef(destinations);
  const [menuState, setMenuState] = useState<MapLongPressMenuState>(CLOSED_MENU_STATE);
  const [isApplying, setIsApplying] = useState(false);

  startingPointRef.current = startingPoint;
  destinationsRef.current = destinations;

  const closeMenu = useCallback(() => {
    setMenuState(CLOSED_MENU_STATE);
  }, []);

  const openMenu = useCallback((payload: MapLongPressPayload) => {
    setMenuState({
      open: true,
      coords: payload.coords,
      anchor: payload.anchor,
    });
  }, []);

  const applyAtCurrentCoords = useCallback(
    async (mode: "start" | "destination", coords: Coordinates) => {
      if (isApplying) {
        return;
      }

      setIsApplying(true);

      const actions = {
        setStartingPoint: (point: AddressPoint) => dispatch(setStartingPoint(point)),
        addDestination: (point: AddressPoint) => dispatch(addDestination(point)),
      };

      try {
        const success =
          mode === "start"
            ? await applyStartingPointAtCoords(coords, actions, toast)
            : await applyDestinationAtCoords(
                coords,
                {
                  startingPoint: startingPointRef.current,
                  destinations: destinationsRef.current,
                },
                actions,
                toast
              );

        if (success) {
          closeMenu();
        }
      } finally {
        setIsApplying(false);
      }
    },
    [closeMenu, dispatch, isApplying, toast]
  );

  const handleSelectStart = useCallback(() => {
    if (!menuState.coords) {
      return;
    }

    void applyAtCurrentCoords("start", menuState.coords);
  }, [applyAtCurrentCoords, menuState.coords]);

  const handleSelectDestination = useCallback(() => {
    if (!menuState.coords) {
      return;
    }

    void applyAtCurrentCoords("destination", menuState.coords);
  }, [applyAtCurrentCoords, menuState.coords]);

  useEffect(() => {
    if (!isLoaded || !isMobile) {
      closeMenu();
      return;
    }

    const map = yandexMapRef.current;
    if (!map) {
      return;
    }

    return attachMapLongPress(map, {
      onLongPress: openMenu,
    });
  }, [closeMenu, isLoaded, isMobile, openMenu, yandexMapRef]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    closeMenu();
    dispatch(setMapPlacementMode("idle"));
  }, [closeMenu, dispatch, isMobile]);

  return {
    menuState,
    isApplying,
    destinationsCount: destinations.length,
    closeMenu,
    handleSelectStart,
    handleSelectDestination,
  };
}
