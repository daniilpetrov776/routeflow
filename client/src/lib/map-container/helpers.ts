import { getRouteColor } from "@/lib/map-constants";
import type { RouteDisplayItem } from "@/lib/route/route-display-order";
import type { AddressPoint, RouteOption } from "@/store/route-slice";

export const COORDINATE_MATCH_EPSILON = 0.0001;

export function getDestinationKey(destination: AddressPoint): string {
  return `${destination.address.trim()}@${destination.coordinates[0].toFixed(6)},${destination.coordinates[1].toFixed(6)}`;
}

export function getValidDestinations(destinations: AddressPoint[]): AddressPoint[] {
  return destinations.filter((destination) => destination.address?.trim());
}

export function destinationsMatch(a: AddressPoint, b: AddressPoint): boolean {
  return (
    a.address === b.address &&
    Math.abs(a.coordinates[0] - b.coordinates[0]) < COORDINATE_MATCH_EPSILON &&
    Math.abs(a.coordinates[1] - b.coordinates[1]) < COORDINATE_MATCH_EPSILON
  );
}

export function findRouteIndexByDestination(
  destination: AddressPoint,
  routes: RouteOption[]
): number {
  return routes.findIndex((route) => destinationsMatch(route.destination, destination));
}

export function isValidBalloonPosition(position: { x: number; y: number } | null | undefined): boolean {
  return (
    Boolean(position) &&
    typeof position!.x === "number" &&
    typeof position!.y === "number" &&
    !isNaN(position!.x) &&
    !isNaN(position!.y)
  );
}

export interface DestinationMarkerStyle {
  label: number;
  color: string;
}

export function computeDestinationMarkerStyles(
  validDestinations: AddressPoint[],
  routeDisplayItems: RouteDisplayItem[]
): DestinationMarkerStyle[] {
  return validDestinations.map((destination, destinationIndex) => {
    const routeDisplayItem = routeDisplayItems.find(({ route }) =>
      destinationsMatch(route.destination, destination)
    );
    const colorIndex = routeDisplayItem?.colorIndex ?? destinationIndex;

    return {
      label: routeDisplayItem ? routeDisplayItem.colorIndex + 1 : destinationIndex + 1,
      color: getRouteColor(colorIndex),
    };
  });
}
