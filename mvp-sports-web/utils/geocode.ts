"use client";

/**
 * Geocodificación en el navegador usando la Maps JavaScript API
 * (la misma API key ya habilitada para el mapa).
 *
 * Nota: la Geocoding API debe estar habilitada y permitida en las
 * restricciones de la key. Si no lo está, `geocodeAddress` devuelve
 * `permission-denied` para que la UI pueda ofrecer un fallback.
 */

let loaderPromise: Promise<void> | null = null;

function loadMapsJsApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if ((window as any).google?.maps?.Geocoder) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("missing-key"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-mvp-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load-error")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.mvpMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load-error"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export type GeocodeOutcome =
  | { status: "ok"; result: GeocodeResult }
  | { status: "not-found" }
  | { status: "permission-denied" }
  | { status: "error"; message?: string };

export async function geocodeAddress(address: string): Promise<GeocodeOutcome> {
  try {
    await loadMapsJsApi();
  } catch (e: any) {
    return { status: "error", message: e?.message };
  }

  const Geocoder = (window as any).google?.maps?.Geocoder;
  if (!Geocoder) return { status: "error", message: "geocoder-unavailable" };

  try {
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({ address });

    if (!response?.results?.length) return { status: "not-found" };

    const first = response.results[0];
    return {
      status: "ok",
      result: {
        lat: first.geometry.location.lat(),
        lng: first.geometry.location.lng(),
        formattedAddress: first.formatted_address,
      },
    };
  } catch (e: any) {
    const msg = String(e?.message || e?.code || "");
    // Google lanza REQUEST_DENIED cuando la Geocoding API no está permitida en la key.
    if (/REQUEST_DENIED|not allowed to use the geocoder|not authorized/i.test(msg)) {
      return { status: "permission-denied" };
    }
    return { status: "error", message: msg };
  }
}
