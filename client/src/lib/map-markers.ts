import type { AddressPoint } from "@/store/route-slice";
import { sanitizeHtml } from "./sanitize";
import type { YandexPlacemark, YandexMapsNamespace } from "@/types/yandex-maps";

/**
 * Создает маркер начальной точки на карте Yandex Maps
 */
export const createStartMarker = (
  startingPoint: AddressPoint,
  yandexMaps: YandexMapsNamespace
): YandexPlacemark => {
  return new yandexMaps.Placemark(
    startingPoint.coordinates,
    {
      balloonContent: sanitizeHtml(`<strong>Начальная точка</strong><br/>${startingPoint.address}`),
      iconCaption: 'Старт'
    },
    {
      preset: 'islands#greenCircleDotIconWithCaption',
      iconCaptionMaxWidth: '200'
    }
  );
};

/**
 * Создает маркер пункта назначения на карте Yandex Maps
 */
export const createDestinationMarker = (
  destination: AddressPoint,
  index: number,
  yandexMaps: YandexMapsNamespace
): YandexPlacemark => {
  return new yandexMaps.Placemark(
    destination.coordinates,
    {
      balloonContent: sanitizeHtml(`<strong>Пункт назначения ${index + 1}</strong><br/>${destination.address}`),
      iconCaption: `${index + 1}`
    },
    {
      preset: 'islands#redCircleDotIconWithCaption',
      iconCaptionMaxWidth: '200'
    }
  );
};

/**
 * Создает все маркеры для карты (начальная точка + пункты назначения)
 */
export const createAllMarkers = (
  startingPoint: AddressPoint | null,
  destinations: AddressPoint[],
  yandexMaps: YandexMapsNamespace
): YandexPlacemark[] => {
  const markers: YandexPlacemark[] = [];

  if (startingPoint) {
    markers.push(createStartMarker(startingPoint, yandexMaps));
  }

  destinations.forEach((dest, index) => {
    if (dest.address?.trim()) {
      markers.push(createDestinationMarker(dest, index, yandexMaps));
    }
  });

  return markers;
};

