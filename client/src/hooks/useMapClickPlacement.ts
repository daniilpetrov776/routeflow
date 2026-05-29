import { useCallback, useEffect, useRef } from "react";

import { useDispatch, useSelector } from "react-redux";

import { attachMapClickPlacement } from "@/lib/map-container/map-click-placement";

import {

  applyDestinationAtCoords,

  applyStartingPointAtCoords,

} from "@/lib/map-container/apply-map-placement";

import { useToast } from "@/hooks/use-toast";

import { RootState } from "@/store";

import {

  addDestination,

  setMapPlacementMode,

  setStartingPoint,

} from "@/store/route-slice";

import type { Coordinates, YandexMap } from "@/types/yandex-maps";



export function useMapClickPlacement(

  yandexMapRef: React.MutableRefObject<YandexMap | null>,

  isLoaded: boolean

) {

  const dispatch = useDispatch();

  const { toast } = useToast();

  const mapPlacementMode = useSelector((state: RootState) => state.route.mapPlacementMode);

  const startingPoint = useSelector((state: RootState) => state.route.startingPoint);

  const destinations = useSelector((state: RootState) => state.route.destinations);

  const balloonData = useSelector((state: RootState) => state.route.balloon.data);

  const balloonPosition = useSelector((state: RootState) => state.route.balloon.position);



  const modeRef = useRef(mapPlacementMode);

  const startingPointRef = useRef(startingPoint);

  const destinationsRef = useRef(destinations);

  const isPlacingRef = useRef(false);



  modeRef.current = mapPlacementMode;

  startingPointRef.current = startingPoint;

  destinationsRef.current = destinations;



  const placementActions = {

    setStartingPoint: (point: Parameters<typeof setStartingPoint>[0]) => {

      dispatch(setStartingPoint(point));

    },

    addDestination: (point: Parameters<typeof addDestination>[0]) => {

      dispatch(addDestination(point));

    },

  };



  const cancelPlacement = useCallback(() => {

    if (modeRef.current !== "idle") {

      dispatch(setMapPlacementMode("idle"));

    }

  }, [dispatch]);



  const handlePlace = useCallback(

    async (coords: Coordinates) => {

      const mode = modeRef.current;

      if (mode === "idle" || isPlacingRef.current) {

        return;

      }



      isPlacingRef.current = true;



      try {

        if (mode === "start") {

          await applyStartingPointAtCoords(coords, placementActions, toast);

          return;

        }



        await applyDestinationAtCoords(

          coords,

          {

            startingPoint: startingPointRef.current,

            destinations: destinationsRef.current,

          },

          placementActions,

          toast

        );

      } finally {

        isPlacingRef.current = false;

      }

    },

    [dispatch, toast]

  );



  useEffect(() => {

    if (!isLoaded) {

      return;

    }



    const map = yandexMapRef.current;

    if (!map) {

      return;

    }



    return attachMapClickPlacement(map, {

      getMode: () => modeRef.current,

      isBusy: () => isPlacingRef.current,

      onPlace: handlePlace,

      onCancel: cancelPlacement,

    });

  }, [cancelPlacement, handlePlace, isLoaded, yandexMapRef, mapPlacementMode]);



  useEffect(() => {

    if (mapPlacementMode === "idle") {

      return;

    }



    const handleKeyDown = (event: KeyboardEvent) => {

      if (event.key !== "Escape") {

        return;

      }



      const target = event.target;

      if (

        target instanceof HTMLElement &&

        target.closest('input, textarea, [contenteditable="true"]')

      ) {

        return;

      }



      if (balloonData && balloonPosition) {

        return;

      }



      event.preventDefault();

      cancelPlacement();

    };



    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [balloonData, balloonPosition, cancelPlacement, mapPlacementMode]);

}


