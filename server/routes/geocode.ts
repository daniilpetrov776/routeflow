import type { Express, Request, Response } from "express";
import { geocodeQuerySchema } from "../lib/validation-schemas";
import { fetchGeocoderData, fetchGeocoderByUri, fetchReverseGeocoderData } from "../lib/yandex-api";
import { handleValidationError, handleError } from "../lib/error-handlers";

/**
 * Роут для геокодирования адреса, uri или координат через Yandex Geocoder API
 */
export function registerGeocodeRoute(app: Express) {
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      const validated = geocodeQuerySchema.parse(req.query);

      let data;
      if (validated.ll) {
        const [lonRaw, latRaw] = validated.ll.split(",");
        const lon = Number(lonRaw);
        const lat = Number(latRaw);
        data = await fetchReverseGeocoderData(lon, lat);
      } else if (validated.uri) {
        data = await fetchGeocoderByUri(validated.uri);
      } else {
        data = await fetchGeocoderData(validated.address!, 10);
      }

      res.json(data);
    } catch (error) {
      if (handleValidationError(error, req, res, "Geocode")) {
        return;
      }

      handleError(error, res, "Geocoding failed");
    }
  });
}
