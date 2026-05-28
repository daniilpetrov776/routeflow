import type { AddressPoint } from "@/store/route-slice";
import { sanitizeHtml } from "./sanitize";
import type { YandexPlacemark, YandexMapsNamespace } from "@/types/yandex-maps";

const START_MARKER_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <path d="M17 40C17 40 4 25.7 4 15.8C4 8.6 9.8 3 17 3C24.2 3 30 8.6 30 15.8C30 25.7 17 40 17 40Z" fill="#111827" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="17" cy="16" r="5.5" fill="#ffffff"/>
    </svg>`
  );

const createNumberMarkerSvg = (color: string, label: number): string =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="${color}" stroke="#ffffff" stroke-width="4"/>
      <text x="17" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${label}</text>
    </svg>`
  );

interface DestinationMarkerStyle {
  label: number;
  color: string;
}

interface CreateMarkersOptions {
  destinationStyles?: DestinationMarkerStyle[];
}

export const createStartMarker = (
  startingPoint: AddressPoint,
  yandexMaps: YandexMapsNamespace
): YandexPlacemark => {
  return new yandexMaps.Placemark(
    startingPoint.coordinates,
    {
      balloonContent: sanitizeHtml(`<strong>Начальная точка</strong><br/>${startingPoint.address}`),
    },
    {
      iconLayout: "default#image",
      iconImageHref: START_MARKER_SVG,
      iconImageSize: [34, 42],
      iconImageOffset: [-17, -40],
    }
  );
};

export const createDestinationMarker = (
  destination: AddressPoint,
  index: number,
  yandexMaps: YandexMapsNamespace,
  style?: DestinationMarkerStyle
): YandexPlacemark => {
  const label = style?.label ?? index + 1;
  const color = style?.color ?? "#dc3545";

  return new yandexMaps.Placemark(
    destination.coordinates,
    {
      balloonContent: sanitizeHtml(`<strong>Пункт назначения ${label}</strong><br/>${destination.address}`),
    },
    {
      iconLayout: "default#image",
      iconImageHref: createNumberMarkerSvg(color, label),
      iconImageSize: [34, 34],
      iconImageOffset: [-17, -17],
    }
  );
};

export const createAllMarkers = (
  startingPoint: AddressPoint | null,
  destinations: AddressPoint[],
  yandexMaps: YandexMapsNamespace,
  options: CreateMarkersOptions = {}
): YandexPlacemark[] => {
  const markers: YandexPlacemark[] = [];

  if (startingPoint) {
    markers.push(createStartMarker(startingPoint, yandexMaps));
  }

  destinations.forEach((dest, index) => {
    if (dest.address?.trim()) {
      markers.push(createDestinationMarker(dest, index, yandexMaps, options.destinationStyles?.[index]));
    }
  });

  return markers;
};
