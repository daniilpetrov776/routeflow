import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRouteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Yandex Maps API proxy routes
  app.get("/api/geocode", async (req, res) => {
    try {
      const { address } = req.query;
      const apiKey = process.env.YANDEX_MAPS_API_KEY || process.env.VITE_YANDEX_MAPS_API_KEY || "";
      
      if (!apiKey) {
        throw new Error("Yandex Maps API key not configured");
      }

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address as string)}&format=json&results=10`
      );

      if (!response.ok) {
        throw new Error(`Yandex API error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Geocoding failed" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const { startingPoint, destinations, transportMode } = req.body;
      const apiKey = process.env.YANDEX_MAPS_API_KEY || process.env.VITE_YANDEX_MAPS_API_KEY || "";
      
      if (!apiKey) {
        throw new Error("Yandex Maps API key not configured");
      }

      // Calculate routes using Yandex Router API
      const routes = [];
      
      for (let i = 0; i < destinations.length; i++) {
        const destination = destinations[i];
        const routeResponse = await fetch(
          `https://api.routing.yandex.net/v2/route?apikey=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              waypoints: [
                { position: startingPoint.coordinates },
                { position: destination.coordinates }
              ],
              mode: {
                transportMode,
              },
              route_options: {
                alternatives: true,
                avoid_tolls: false,
                avoid_unpaved: false
              }
            })
          }
        );

        if (!routeResponse.ok) {
          throw new Error(`Route calculation failed: ${routeResponse.statusText}`);
        }

        const routeData = await routeResponse.json();
        routes.push({
          destination: destination,
          routes: routeData.route || []
        });
      }

      // Store route calculation
      const route = await storage.createRoute({
        startingPoint: startingPoint.address,
        destinations: destinations.map((d: any) => d.address),
        transportMode,
        routeData: routes
      });

      res.json({ routes, routeId: route.id });
    } catch (error) {
      console.error("Route calculation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Route calculation failed" });
    }
  });

  app.get("/api/suggest", async (req, res) => {
    try {
      const { text } = req.query;
      const apiKey = process.env.YANDEX_MAPS_API_KEY || process.env.VITE_YANDEX_MAPS_API_KEY || "";
      
      if (!apiKey) {
        throw new Error("Yandex Maps API key not configured");
      }

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(text as string)}&format=json&results=10`
      );

      if (!response.ok) {
        throw new Error(`Yandex Geocoder API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Парсим геокодер и извлекаем подходящие предложения (например, адреса)
      const suggestions = (data.response?.GeoObjectCollection?.featureMember || []).map(
        (item: any) => {
          const geoObject = item.GeoObject;
          return {
            name: geoObject.name,
            description: geoObject.description,
            fullAddress: geoObject.metaDataProperty?.GeocoderMetaData?.text,
            coordinates: geoObject.Point?.pos?.split(" ").map(Number) // [lon, lat]
          };
        }
      );

      res.json({ suggestions });
    } catch (error) {
      console.error("Suggest error (via geocoder):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Suggest (via geocoder) failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
