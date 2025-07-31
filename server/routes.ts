import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRouteSchema } from "@shared/schema";
import { z } from "zod";

// Helper functions for route calculations
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateDuration = (distance: number, mode: string): number => {
  const speeds = {
    walking: 5, // km/h
    cycling: 15,
    transit: 25,
    driving: 40
  };
  const speed = speeds[mode as keyof typeof speeds] || 25;
  return (distance / 1000) / speed * 3600; // seconds
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}ч ${remainingMinutes}м`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
};

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
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address as string)}&format=json&results=10&lang=ru_RU`
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

      // Calculate estimated routes based on coordinates
      const routes = [];
      
      for (let i = 0; i < destinations.length; i++) {
        const destination = destinations[i];
        
        // Calculate approximate distance using Haversine formula
        const distance = calculateDistance(
          startingPoint.coordinates[0], startingPoint.coordinates[1],
          destination.coordinates[0], destination.coordinates[1]
        );
        
        // Generate multiple route alternatives with different characteristics
        const routeAlternatives = [];
        
        // Main route
        const baseDuration = calculateDuration(distance, transportMode);
        routeAlternatives.push({
          duration: { value: baseDuration, text: formatDuration(baseDuration) },
          distance: { value: distance, text: formatDistance(distance) },
          traffic_info: { level: 'light' },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates]
          }
        });
        
        // Alternative route (slightly longer)
        const altDuration = baseDuration * 1.2;
        const altDistance = distance * 1.1;
        routeAlternatives.push({
          duration: { value: altDuration, text: formatDuration(altDuration) },
          distance: { value: altDistance, text: formatDistance(altDistance) },
          traffic_info: { level: 'moderate' },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates]
          }
        });
        
        // Third alternative (avoiding traffic)
        const trafficDuration = baseDuration * 1.5;
        const trafficDistance = distance * 1.3;
        routeAlternatives.push({
          duration: { value: trafficDuration, text: formatDuration(trafficDuration) },
          distance: { value: trafficDistance, text: formatDistance(trafficDistance) },
          traffic_info: { level: 'heavy' },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates]
          }
        });

        routes.push({
          destination: destination,
          routes: routeAlternatives
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
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(text as string)}&format=json&results=10&lang=ru_RU`
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
