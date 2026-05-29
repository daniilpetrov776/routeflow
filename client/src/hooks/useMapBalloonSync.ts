import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  openBalloonFromRequest,
  scheduleBalloonReposition,
  syncBalloonDataFromRoutes,
} from "@/lib/map-container/balloon-sync";
import type { AddressPoint, RouteBalloonState, RouteOption, TransportMode } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";

export interface UseMapBalloonSyncParams {
  yandexMapRef: React.MutableRefObject<YandexMap | null>;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  calculatedRoutes: RouteOption[];
  startingPoint: AddressPoint | null;
  isCalculating: boolean;
  transportMode: TransportMode;
  balloon: RouteBalloonState;
  requestedRouteIndex: number | null;
}

export function useMapBalloonSync({
  yandexMapRef,
  routesRef,
  calculatedRoutes,
  startingPoint,
  isCalculating,
  transportMode,
  balloon,
  requestedRouteIndex,
}: UseMapBalloonSyncParams): void {
  const dispatch = useDispatch();
  const lastBalloonDataRef = useRef<typeof balloon.data>(null);
  const lastTransportModeRef = useRef<TransportMode>(transportMode);

  useEffect(() => {
    if (!balloon.data) {
      lastBalloonDataRef.current = null;
    }
  }, [balloon.data]);

  useEffect(() => {
    openBalloonFromRequest({
      requestedRouteIndex,
      yandexMap: yandexMapRef.current,
      routesRef,
      calculatedRoutes,
      startingPoint,
      dispatch,
    });
  }, [requestedRouteIndex, yandexMapRef, routesRef, calculatedRoutes, startingPoint, dispatch]);

  useEffect(() => {
    syncBalloonDataFromRoutes({
      balloonData: balloon.data,
      calculatedRoutes,
      dispatch,
    });
  }, [calculatedRoutes, balloon.data, transportMode, dispatch]);

  useEffect(() => {
    if (!balloon.data || !yandexMapRef.current || isCalculating || calculatedRoutes.length === 0) {
      return;
    }

    return scheduleBalloonReposition({
      balloonData: balloon.data,
      calculatedRoutes,
      transportMode,
      startingPoint,
      yandexMap: yandexMapRef.current,
      routesRef,
      lastBalloonDataRef,
      lastTransportModeRef,
      dispatch,
    });
  }, [
    calculatedRoutes,
    balloon.data,
    isCalculating,
    transportMode,
    startingPoint,
    yandexMapRef,
    dispatch,
    routesRef,
  ]);
}
