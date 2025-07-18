export interface ShakaPlayerConfig {
  // Streaming & Buffering
  streaming: {
    bufferingGoal: number;
    rebufferingGoal: number;
    bufferBehind: number;
    ignoreTextStreamFailures: boolean;
    jumpLargeGaps: boolean;
    retryParameters: {
      maxAttempts: number;
      baseDelay: number;
      backoffFactor: number;
      fuzzFactor: number;
      timeout: number;
    };
    lowLatencyMode: boolean;
    forceTransmuxTS: boolean;
    inaccurateManifestTolerance: number;
    stallEnabled: boolean;
    stallThreshold: number;
    stallSkip: number;
    smallGapLimit: number;
  };

  // Manifest Configuration
  manifest: {
    dash: {
      clockSyncUri: string;
      ignoreDrmInfo: boolean;
      ignoreMinBufferTime: boolean;
      ignoreSuggestedPresentationDelay: boolean;
      autoCorrectDrift: boolean;
      initialSegmentLimit: number;
      disableAudioGroups: boolean;
      defaultPresentationDelay: number;
      ignoreEmptyAdaptationSet: boolean;
      xlinkFailGracefully: boolean;
    };
    hls: {
      ignoreManifestProgramDateTime: boolean;
      useSafariBehaviorForLive: boolean;
      ignoreTextStreamFailures: boolean;
      defaultAudioCodec: string;
      enableAppleAdvancedAES: boolean;
    };
  };

  // ABR (Adaptive Bitrate) Configuration
  abr: {
    enabled: boolean;
    defaultBandwidthEstimate: number;
    bandwidthDowngradeTarget: number;
    bandwidthUpgradeTarget: number;
    switchInterval: number;
    restrictions: {
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
      minPixels: number;
      maxPixels: number;
      minBandwidth: number;
      maxBandwidth: number;
    };
    manager: 'default' | 'static' | 'abr' | 'temporal' | 'bandwidth';
    advanced: {
      useNetworkInformation: boolean;
      usePixelRatio: boolean;
      useDevicePixelRatio: boolean;
    };
  };

  // DRM Configuration
  drm: {
    servers: { [keySystem: string]: string };
    advanced: {
      [keySystem: string]: {
        audioRobustness?: string;
        videoRobustness?: string;
        persistentState?: 'required' | 'optional' | 'not-allowed';
        distinctiveIdentifier?: 'required' | 'optional' | 'not-allowed';
        delayLicenseRequestUntilPlayed: boolean;
      };
    };
    clearKeys: { [keyId: string]: string };
    retryParameters: {
      maxAttempts: number;
      baseDelay: number;
      backoffFactor: number;
      fuzzFactor: number;
      timeout: number;
    };
    logLicenseExchange: boolean;
    updateExpirationTime: number;
  };

  // Playback Configuration
  play: {
    audioLanguage: string;
    textLanguage: string;
    textLanguageRole: string;
    startTime: number;
    preferredAudioChannelCount: number;
    restrictions: {
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
      minPixels: number;
      maxPixels: number;
      minBandwidth: number;
      maxBandwidth: number;
    };
    offline: {
      trackSelectionCallback: (tracks: Track[]) => Track[];
    };
  };

  // UI Configuration
  ui: {
    controlPanelElements: string[];
    overflowMenuButtons: string[];
    addSeekBar: boolean;
    seekBarColors: {
      base: string;
      buffered: string;
      played: string;
      hover: string;
    };
    doubleClickForFullscreen: boolean;
  };

  // Preload Configuration
  preload: {
    enabled: boolean;
    lookahead: number;
    segmentRelative: boolean;
    bandwidthUpgradeTarget: number;
    safeSeekOffset: number;
  };

  // Offline Configuration
  offline: {
    usePersistentLicense: boolean;
    trackSelectionCallback: (tracks: Track[]) => Track[];
    progressCallback: (contentUri: string, progress: number) => void;
  };

  // Advanced Features
  features: {
    mp4: {
      forceTransmux: boolean;
    };
    hls: {
      useFullSegmentsForStartTime: boolean;
    };
    mediaCapabilities: {
      useMediaCapabilities: boolean;
    };
    lowLatency: {
      enabled: boolean;
      lookaheadLimit: number;
    };
  };
}