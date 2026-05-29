import { getComparableSuggestionAddress, normalizeComparableAddress } from "@/lib/address-format";
import { MOSCOW_CENTER } from "@/lib/map-constants";
import type { Suggestion, SuggestLocationContext } from "@/hooks/useAddressSuggestions";
import type { AddressPoint } from "@/store/route-slice";
import { COORDINATE_MATCH_EPSILON } from "./constants";

export function buildSuggestLocationContext(
  startingPoint: AddressPoint | null | undefined
): SuggestLocationContext {
  const [lat, lon] = startingPoint?.coordinates ?? MOSCOW_CENTER;
  return {
    ll: `${lon},${lat}`,
    near: startingPoint?.address,
  };
}

export function getBusinessKey(suggestion: Suggestion): string {
  return (
    suggestion.uri?.trim() ||
    `${suggestion.title.trim().toLowerCase()}|${suggestion.subtitle?.trim().toLowerCase() ?? ""}`
  );
}

export function isDestinationAlreadyAdded(
  point: AddressPoint,
  destinations: AddressPoint[]
): boolean {
  return destinations.some(
    (destination) =>
      destination.address === point.address &&
      Math.abs(destination.coordinates[0] - point.coordinates[0]) < COORDINATE_MATCH_EPSILON &&
      Math.abs(destination.coordinates[1] - point.coordinates[1]) < COORDINATE_MATCH_EPSILON
  );
}

export function isSuggestionAlreadyAdded(
  suggestion: Suggestion,
  destinations: AddressPoint[]
): boolean {
  const comparableAddress = normalizeComparableAddress(getComparableSuggestionAddress(suggestion));

  return destinations.some((destination) => {
    if (normalizeComparableAddress(destination.address) === comparableAddress) {
      return true;
    }

    if (
      suggestion.coordinates &&
      Math.abs(destination.coordinates[0] - suggestion.coordinates[0]) < COORDINATE_MATCH_EPSILON &&
      Math.abs(destination.coordinates[1] - suggestion.coordinates[1]) < COORDINATE_MATCH_EPSILON
    ) {
      return true;
    }

    return false;
  });
}
