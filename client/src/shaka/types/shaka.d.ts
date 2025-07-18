// types/shaka.d.ts

declare namespace ShakaType {
  export class Player {
    constructor(videoElement: HTMLMediaElement);

    load(uri: string, startTime?: number, mimeType?: string): Promise<void>;
    unload(): Promise<void>;
    destroy(): Promise<void>;

    isAudioOnly(): boolean;
    isLive(): boolean;
    isTextTrackVisible(): boolean;
    getManifest(): Manifest | null;
    getVariantTracks(): VariantTrack[];
    getTextTracks(): TextTrack[];
    getAudioLanguages(): string[];
    getTextLanguages(): string[];
    getStats(): PlayerStats;
    getPlaybackRate(): number;
    getConfiguration(): PlayerConfiguration;
    configure(config: Partial<PlayerConfiguration>): void;

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;

    selectVariantTrack(track: VariantTrack, clearBuffer: boolean): void;
    selectTextTrack(track: TextTrack): void;

    setTextTrackVisibility(visible: boolean): void;
    setAudioLanguage(language: string): void;
    setTextLanguage(language: string): void;
    setPlaybackRate(rate: number): void;

    // DRM
    getDrmInfo(): DrmInfo | null;
    isTextTrackVisible(): boolean;

    // Offline support
    static storage: typeof shaka.offline.Storage;
  }

  export interface PlayerConfiguration {
    manifest?: {
      dash?: {
        ignoreMinBufferTime?: boolean;
      };
    };
    streaming?: {
      bufferingGoal?: number;
      rebufferingGoal?: number;
      stallEnabled?: boolean;
      alwaysStreamText?: boolean;
      smallFragmentDelay?: number,
      [key]: unknown
    };
    abr?: {
      enabled?: boolean;
      defaultBandwidthEstimate?: number;
    };
    drm?: {
      servers?: Record<string, string>;
      clearKeys?: Record<string, string>;
    };
  }

  export interface VariantTrack {
    id: number;
    bandwidth: number;
    language: string;
    label: string;
    kind: string;
    active: boolean;
    videoId: number;
    audioId: number;
    width: number;
    height: number;
    frameRate: number;
    pixelAspectRatio: string;
    hdr: boolean;
  }

  export interface TextTrack {
    id: number;
    language: string;
    kind: string;
    label: string;
    mimeType: string;
    codec: string;
    active: boolean;
  }

  export interface PlayerStats {
    width: number;
    height: number;
    streamBandwidth: number;
    decodedFrames: number;
    droppedFrames: number;
    estimatedBandwidth: number;
    playTime: number;
    bufferingTime: number;
    bufferingEvents: number;
  }

  export interface Manifest {
    presentationTimeline: {
      getDuration(): number;
    };
    variants: VariantTrack[];
    textStreams: TextTrack[];
  }

  export interface DrmInfo {
    keySystem: string;
    licenseServerUri: string;
    initData: Array<{
      initDataType: string;
      initData: ArrayBuffer;
    }>;
  }

  // Offline API
  export namespace offline {
    export class Storage {
      constructor(player?: Player);
      configure(config: PlayerConfiguration): void;
      store(uri: string): Promise<StoredContent>;
      remove(contentUri: string): Promise<void>;
      list(): Promise<StoredContent[]>;
      static support(): boolean;
    }

    export interface StoredContent {
      offlineUri: string;
      originalManifestUri: string;
      duration: number;
      size: number;
      tracks: VariantTrack[];
      appMetadata?: Record<string, unknown>;
    }
  }
}

declare let shaka: shaka.IShaka;
