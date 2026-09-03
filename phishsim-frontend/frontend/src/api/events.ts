import { campaignsApi } from './campaigns';
import type { CampaignProgress } from './types';

/**
 * FE-05 Live-Monitoring.
 *
 * Die Architekturskizze sieht zwischen Frontend und Backend-API nur
 * REST/HTTP vor. Fuer eine Live-Ansicht braucht es aber einen Kanal, der
 * ohne Nutzeraktion aktualisiert. Diese Schicht kapselt beide Varianten:
 *
 *   1. Bevorzugt Server-Sent Events auf /campaigns/{id}/stream.
 *      SSE statt WebSocket, weil der Datenfluss einseitig ist und SSE
 *      durch jeden Reverse Proxy kommt, der HTTP/1.1 spricht.
 *   2. Faellt bei Fehler oder fehlender Unterstuetzung auf Polling zurueck.
 *
 * Wenn SSE nicht in die Architektur soll, kann `preferStream` auf false
 * gesetzt werden - der Rest der Anwendung merkt davon nichts.
 */

export type TransportMode = 'stream' | 'poll';

export interface ProgressSubscription {
  close: () => void;
}

interface SubscribeOptions {
  campaignId: string;
  onProgress: (progress: CampaignProgress) => void;
  onTransportChange?: (mode: TransportMode) => void;
  onError?: (error: unknown) => void;
  pollIntervalMs?: number;
  preferStream?: boolean;
}

export function subscribeToCampaignProgress(options: SubscribeOptions): ProgressSubscription {
  const {
    campaignId,
    onProgress,
    onTransportChange,
    onError,
    pollIntervalMs = 5000,
    preferStream = true,
  } = options;

  let closed = false;
  let source: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    if (closed || pollTimer) return;
    onTransportChange?.('poll');

    const tick = async () => {
      if (closed) return;
      try {
        onProgress(await campaignsApi.progress(campaignId));
      } catch (error) {
        onError?.(error);
      }
    };

    void tick();
    pollTimer = setInterval(tick, pollIntervalMs);
  }

  function startStream() {
    const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
    source = new EventSource(`${base}/campaigns/${campaignId}/stream`, {
      withCredentials: true,
    });

    source.addEventListener('progress', (event) => {
      try {
        onProgress(JSON.parse((event as MessageEvent<string>).data) as CampaignProgress);
      } catch (error) {
        onError?.(error);
      }
    });

    source.onopen = () => onTransportChange?.('stream');

    source.onerror = () => {
      // EventSource versucht selbst zu reconnecten. Wir geben ihm einen
      // Versuch und wechseln dann dauerhaft auf Polling, damit die Ansicht
      // waehrend eines laufenden Versands nicht einfriert.
      source?.close();
      source = null;
      startPolling();
    };
  }

  if (preferStream && typeof EventSource !== 'undefined') {
    startStream();
  } else {
    startPolling();
  }

  return {
    close: () => {
      closed = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}
