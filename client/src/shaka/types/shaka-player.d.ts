/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-misused-new */
// shaka-player.d.ts
declare namespace shaka {
  /** Error Categories */
  export enum ErrorCategory {
    NETWORK = 1,
    MEDIA = 2,
    MANIFEST = 3,
    STREAMING = 4,
    DRM = 5,
    PLAYER = 6,
    CAST = 7,
    STORAGE = 8,
    OFFLINE = 9,
    UTIL = 10,
    EMBEDDED = 11,
    TEXT = 12,
    AUDIO = 13,
    VIDEO = 14,
    LICENSE = 15,
    KEY = 16,
    INTERNAL = 17,
    UNKNOWN = 18,
  }

  /** Error Severity */
  export enum ErrorSeverity {
    RECOVERABLE = 1,
    CRITICAL = 2,
  }

  /** Player Error object */
  export interface Error {
    code: number;
    severity: ErrorSeverity;
    category: ErrorCategory;
    message: string;
    stack?: string;
    data?: any;
  }

  /** Retry parameters */
  export interface RetryParameters {
    maxAttempts?: number;
    baseDelay?: number; // milliseconds
    backoffFactor?: number;
    fuzzFactor?: number;
    timeout?: number; // milliseconds
  }

  /** Player Configuration */
  export interface PlayerConfiguration {
    streaming?: {
      bufferingGoal?: number;
      rebufferingGoal?: number;
      bufferBehind?: number;
      ignoreTextStreamFailures?: boolean;
      retryParameters?: RetryParameters;
      useNativeHlsOnSafari?: boolean;
      useNativeDashOnSafari?: boolean;
      [key: string]: any;
    };
    abr?: {
      enabled?: boolean;
      defaultBandwidthEstimate?: number;
      bandwidthUpgradeTarget?: number;
      bandwidthDowngradeTarget?: number;
      switchInterval?: number;

      [key: string]: any;
    };
    drm?: {
      delayLicenseRequestUntilPlayed?: boolean;
      clearKeys?: Record<string, string>;
      servers?: Record<string, string>;
      advanced?: Record<string, any>;
      retryParameters?: RetryParameters;
      distinctiveIdentifierRequired?: boolean;
      persistentStateRequired?: boolean;
      videoRobustness?: string;
      audioRobustness?: string;
      [key: string]: any;
    };
    manifest?: {
      retryParameters?: RetryParameters;
      [key: string]: any;
    };
    offline?: {
      usePersistentLicense?: boolean;
      drmSessionId?: string;
    };
    preferredAudioLanguage?: string;
    preferredTextLanguage?: string;
    restrictions?: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      minPixels?: number;
      maxPixels?: number;
      minBandwidth?: number;
      maxBandwidth?: number;
      allowedAudioRoles?: string[];
      allowedTextRoles?: string[];
    };
    // add other config options as needed
    [key: string]: any;
  }

  /** Variant (audio+video) track */
  export interface VariantTrack {
    id: number;
    active: boolean;
    bandwidth: number;
    language: string;
    kind?: string;
    width?: number;
    height?: number;
    codecs?: string;
    videoCodec?: string;
    audioCodec?: string;
    primary?: boolean;
    roles?: string[];
  }

  /** Text track (subtitles, captions) */
  export interface TextTrack {
    language: string;
    kind: string; // 'caption', 'subtitle', 'description', etc.
    label?: string;
    active: boolean;
  }

  /** Player stats (simplified) */
  export interface Stats {
    width: number;
    height: number;
    buffered: number;
    droppedFrames?: number;
    estimatedBandwidth?: number;
    playTime?: number;
    // extend with other stats fields as needed
  }

  /** Chapters from manifest */
  export interface Chapter {
    startTime: number;
    endTime: number;
    title: string;
  }

  /** Event map for Player events */
  export interface PlayerEventMap {
    buffering: { buffering: boolean };
    error: { detail: Error };
    adaptation: Event;
    trackschanged: Event;
    manifestparsed: { data: any };
    streamingfailure: { detail: Error };
    streamingerror: { detail: Error };
    drmtimeupdate: Event;
    drmkeystatuseschange: Event;
    drmservercertificateupdated: Event;
    streamingcompleted: Event;
    // Add custom/extended events if needed
  }

  /** Event listener type */
  export type EventListener<K extends keyof PlayerEventMap> = (
    event: PlayerEventMap[K]
  ) => void;

  /** Offline storage APIs */
  export interface Storage {
    list(): Promise<OfflineContentSummary[]>; // Lists all stored offline content
    remove(offlineUri: string): Promise<void>; // Remove offline content by uri
    destroy(): Promise<void>; // Clear all offline storage
  }

  /** Offline content metadata */
  export interface OfflineContentSummary {
    offlineUri: string;
    originalManifestUri: string;
    size: number; // bytes
    expiration: number; // UNIX timestamp ms or 0 for no expiration
    creationTime: number; // UNIX timestamp ms
  }

  /** Main Player interface */
  export interface Player {
    new (video: HTMLVideoElement): Player;

    load(
      manifestUri: string,
      startTime?: number,
      mimeType?: string
    ): Promise<void>;
    destroy(): Promise<void>;
    selectAudioLanguage(language: string): void;
    setTextTrackVisibility(on: boolean): void;
    getStats(): Stats;
    addEventListener<K extends keyof PlayerEventMap>(
      type: K,
      listener: EventListener<K>
    ): void;
    removeEventListener<K extends keyof PlayerEventMap>(
      type: K,
      listener: EventListener<K>
    ): void;
    unload(): Promise<void>;

    isAudioOnly(): boolean;
    isLive(): boolean;
    getManifest(): Manifest | null;
    getVariantTracks(): VariantTrack[];
    getTextTracks(): TextTrack[];
    getAudioLanguages(): string[];
    getTextLanguages(): string[];
    getPlaybackRate(): number;
    getConfiguration(): PlayerConfiguration;
    configure(config: Partial<PlayerConfiguration>): void;

    selectVariantTrack(track: VariantTrack, clearBuffer: boolean): void;
    selectTextTrack(track: TextTrack): void;

    setAudioLanguage(language: string): void;
    setTextLanguage(language: string): void;
    setPlaybackRate(rate: number): void;

    // DRM
    getDrmInfo(): DrmInfo | null;
    isTextTrackVisible(): boolean;
    /** Offline storage interface */
    storage?: Storage;
    isBrowserSupported(): boolean;
  }

  /** Polyfill interface */
  export interface Polyfill {
    installAll(): void;
  }

  /** Full Shaka static export */
  export interface ShakaStatic {
    Player: Player;
    polyfill: Polyfill;

    // Utility methods
  }
}

/** The default exported Shaka object */
declare const shaka: shaka.ShakaStatic;
export = shaka;
