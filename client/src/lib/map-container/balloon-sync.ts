import { recalculateBalloonPosition } from "@/lib/route/route-balloon-position";
import {
  clearRequestedRouteIndex,
  openRouteBalloon,
  updateRouteBalloonData,
  updateRouteBalloonPosition,
} from "@/store/route-slice";
import type { AddressPoint, RouteBalloonData, RouteOption, TransportMode } from "@/store/route-slice";
import type { YandexMap, YandexMultiRoute } from "@/types/yandex-maps";
import type { Dispatch } from "@reduxjs/toolkit";
import { findRouteIndexByDestination, isValidBalloonPosition } from "./helpers";

export interface OpenBalloonFromRequestParams {
  requestedRouteIndex: number | null;
  yandexMap: YandexMap | null;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  calculatedRoutes: RouteOption[];
  startingPoint: AddressPoint | null;
  dispatch: Dispatch;
}

export function openBalloonFromRequest({
  requestedRouteIndex,
  yandexMap,
  routesRef,
  calculatedRoutes,
  startingPoint,
  dispatch,
}: OpenBalloonFromRequestParams): void {
  if (
    requestedRouteIndex === null ||
    !yandexMap ||
    requestedRouteIndex < 0 ||
    requestedRouteIndex >= calculatedRoutes.length ||
    requestedRouteIndex >= routesRef.current.length ||
    !startingPoint
  ) {
    return;
  }

  const route = routesRef.current[requestedRouteIndex];
  const routeOption = calculatedRoutes[requestedRouteIndex];

  if (!route || !routeOption) {
    return;
  }

  const balloonPosition = recalculateBalloonPosition(
    route,
    yandexMap,
    routeOption.destination,
    routeOption,
    startingPoint
  );

  if (isValidBalloonPosition(balloonPosition)) {
    dispatch(
      openRouteBalloon({
        data: {
          routeIndex: requestedRouteIndex,
          destination: routeOption.destination,
          duration: routeOption.duration,
          distance: routeOption.distance,
          alternativeIndex: routeOption.selectedAlternativeIndex,
        },
        position: balloonPosition!,
      })
    );
    dispatch(clearRequestedRouteIndex());
  }
}

export interface SyncBalloonDataParams {
  balloonData: RouteBalloonData | null;
  calculatedRoutes: RouteOption[];
  dispatch: Dispatch;
}

export function syncBalloonDataFromRoutes({
  balloonData,
  calculatedRoutes,
  dispatch,
}: SyncBalloonDataParams): void {
  if (!balloonData || calculatedRoutes.length === 0) {
    return;
  }

  const routeIndex = findRouteIndexByDestination(balloonData.destination, calculatedRoutes);

  if (routeIndex >= 0) {
    const routeOption = calculatedRoutes[routeIndex];

    if (
      balloonData.duration !== routeOption.duration ||
      balloonData.distance !== routeOption.distance ||
      balloonData.routeIndex !== routeIndex ||
      balloonData.alternativeIndex !== routeOption.selectedAlternativeIndex
    ) {
      dispatch(
        updateRouteBalloonData({
          duration: routeOption.duration,
          distance: routeOption.distance,
          routeIndex,
          alternativeIndex: routeOption.selectedAlternativeIndex,
        })
      );
    }
  }
}

export interface RepositionBalloonParams {
  balloonData: RouteBalloonData;
  calculatedRoutes: RouteOption[];
  transportMode: TransportMode;
  startingPoint: AddressPoint | null;
  yandexMap: YandexMap | null;
  routesRef: React.MutableRefObject<YandexMultiRoute[]>;
  lastBalloonDataRef: React.MutableRefObject<RouteBalloonData | null>;
  lastTransportModeRef: React.MutableRefObject<TransportMode>;
  dispatch: Dispatch;
}

export function scheduleBalloonReposition({
  balloonData,
  calculatedRoutes,
  transportMode,
  startingPoint,
  yandexMap,
  routesRef,
  lastBalloonDataRef,
  lastTransportModeRef,
  dispatch,
}: RepositionBalloonParams): () => void {
  const transportModeChanged = lastTransportModeRef.current !== transportMode;

  const routeDataChanged = Boolean(
    lastBalloonDataRef.current &&
      (lastBalloonDataRef.current.duration !== balloonData.duration ||
        lastBalloonDataRef.current.distance !== balloonData.distance ||
        lastBalloonDataRef.current.alternativeIndex !== balloonData.alternativeIndex)
  );

  const isNewlyOpened = !lastBalloonDataRef.current;

  if (isNewlyOpened && !transportModeChanged) {
    lastBalloonDataRef.current = balloonData;
    lastTransportModeRef.current = transportMode;
    return () => undefined;
  }

  if (!transportModeChanged && !routeDataChanged) {
    lastBalloonDataRef.current = balloonData;
    lastTransportModeRef.current = transportMode;
    return () => undefined;
  }

  const timeoutId = setTimeout(() => {
    const routeIndex = findRouteIndexByDestination(balloonData.destination, calculatedRoutes);

    if (routeIndex < 0 || !routesRef.current || routeIndex >= routesRef.current.length) {
      return;
    }

    const route = routesRef.current[routeIndex];
    if (!route) {
      return;
    }

    const routeOption = calculatedRoutes[routeIndex];

    if (!yandexMap || !startingPoint) return;

    const newPosition = recalculateBalloonPosition(
      route,
      yandexMap,
      balloonData.destination,
      routeOption,
      startingPoint
    );

    if (isValidBalloonPosition(newPosition)) {
      dispatch(updateRouteBalloonPosition(newPosition!));
    }

    lastBalloonDataRef.current = balloonData;
    lastTransportModeRef.current = transportMode;
  }, 100);

  return () => clearTimeout(timeoutId);
}
