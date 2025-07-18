/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { ShakaPlayerConfig } from "../types/shaka";

interface QualityOption {
  id: string;
  height: number;
  bandwidth: number;
}

interface CaptionOption {
  id: string;
  language: string;
  kind: string;
}

interface AudioTrackOption {
  id: string;
  language: string;
  kind: string;
}

type ShakaPlayerType = {
  Player: any;
  polyfill: {
    installAll: () => void;
  };
};
type BufferedRange = { start: number; end: number };

export const formatTime = (time: number | null) => {
  if (time === null || isNaN(time)) return "--:--";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const useShakaPlayer = () => {
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualitis] = useState<QualityOption[]>([]);
  const [captions, setCaptions] = useState<CaptionOption[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [selectedQualitie, setSelectedQuality] = useState<string>("Auto");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState<number>(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- PLAYER CONTROLS ---

  const updateBufferedRanges = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const bufferedInfo = player.getBufferedInfo();

    if (bufferedInfo && Array.isArray(bufferedInfo.video)) {
      const ranges = bufferedInfo.video.map((range: any) => ({
        start: range.start,
        end: range.end,
      }));
      setBufferedRanges(ranges);
    } else {
      setBufferedRanges([]);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleDurationChange = () => {
      setDuration(video.duration);
      updateBufferedRanges();
    };

    const handleProgress = () => {
      updateBufferedRanges()
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      updateBufferedRanges();
    };
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      if (!isNaN(video.volume)) {
        setVolume(video.volume);
        setIsMuted(video.muted);
      }
    };
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleError = (e: any) => {
      console.error("Video element error:", e);
      setError("Video playback error");
    };

    const handleTimeUpdate = () => {
      updateBufferedRanges();
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };

    const handleMetadata = () => {
      handleVolumeChange();
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("loadedmetadata", handleMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleMetadata);
    };
  }, [updateBufferedRanges]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  console.log({duration,currentTime})


  const seekTo = useCallback((time: number) => {
    if (!videoRef.current || isNaN(time)) return;
    videoRef.current.currentTime = time;
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
    setVolume(newVolume);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullScreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullScreen]);

  const seekToChapter = useCallback((startTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    setDuration(startTime);
  }, []);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      videoRef.current.currentTime - 15
    );
  }, []);

  const skipForward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      duration,
      videoRef.current.currentTime + 15
    );
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const updateTracks = useCallback(() => {
    if (!playerRef.current) return;

    try {
      // Update subtitle tracks
      const textTracks = playerRef.current.getTextTracks();
      const subtitles = textTracks.map((track: any, index: number) => ({
        id: index,
        language: track.language || "unknown",
        label: track.label || `Subtitle ${index + 1}`,
        active: track.active || false,
      }));
      setCaptions(subtitles);

      // Update video quality tracks
      const variantTracks = playerRef.current.getVariantTracks();
      const videoQualities = variantTracks
        .filter((track: any) => track.videoCodec)
        .map((track: any) => ({
          id: track.id,
          height: track.height || 0,
          bandwidth: track.bandwidth || 0,
          active: track.active || false,
        }))
        .sort((a: any, b: any) => b.height - a.height);

      setQualitis(videoQualities);
    } catch (error) {
      console.error("Error updating tracks:", error);
    }
  }, []);

  const updateCurrentQuality = useCallback(() => {
    if (!playerRef.current) return;
    try {
      const stats = playerRef.current.getStats();
      if (stats.height) {
        setSelectedQuality(`${stats.height}p`);
      }
    } catch (error) {
      console.error("Error updating quality:", error);
    }
  }, []);

  // --- PLAYER INITIALIZATION ---
  const initializePlayer = useCallback(
    async (url: string, config: Partial<ShakaPlayerConfig>) => {
      setError("");
      setLoading(false);

      const shaka: ShakaPlayerType =
        await require("shaka-player/dist/shaka-player.compiled.js");

      if (!videoRef.current) return;

      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        setError(() => "Browser not supported");
        return;
      }

      const player = new shaka.Player(videoRef.current);
      playerRef.current = player;

      // Track changes event
      player.addEventListener("trackschanged", () => {
        updateTracks();
      });

      // Adaptation events for quality changes
      player.addEventListener("adaptation", () => {
        console.log("adaptation");
        updateCurrentQuality();
      });

      // Buffering events
      player.addEventListener("buffering", (event: any) => {
        console.log("buffering");
        setLoading(event.buffering);
      });

      // Loading events
      player.addEventListener("loading", () => {
        console.log("loading");
        setLoading(true);
      });

      player.addEventListener("loaded", () => {
        // dispatch({ type: "SET_LOADING", payload: false })
        console.log("loaded");
      });

      player.addEventListener("error", (error: any) => {
        console.error("Shaka error", error);
        setError(() => `Error: ${error?.detail?.message || "Unknown"}`);
        // Retry logic (optional)
        setTimeout(() => player.load(url).catch(console.error), 3000);
      });

      player.addEventListener("adaptation", () => {
        const track = player.getVariantTracks().find((t: any) => t.active);
        if (track) {
          setSelectedQuality(() => `${track.height}p`);
        }
      });

      player.configure(config);
      player.configure({ abr: { enabled: true } });

      try {
        await player.load(url);
        setLoading(false);

        const tracks = player.getVariantTracks();
        setTimeout(() => {
          updateTracks();
          updateCurrentQuality();
          if (videoRef.current?.duration) {
            setDuration(videoRef.current.duration);
          }
        }, 200);


        // const qualities: QualityOption[] = tracks.map((track: any) => ({
        //   id: `${track.height}p`,
        //   height: track.height,
        //   bandwidth: track.bandwidth,
        // }));

        // setQualitis(qualities);

        // const status = player.getStats();

        // const textTracks = player.getTextTracks();
        // const captions: CaptionOption[] = textTracks.map((track: any) => ({
        //   id: track.language + "-" + track.kind,
        //   language: track.language,
        //   kind: track.kind,
        // }));

        // setCaptions(captions);

        const audioTracks: AudioTrackOption[] = tracks
          .filter(
            (v: any, i: number, self: any[]) =>
              self.findIndex((t) => t.language === v.language) === i
          )
          .map((track: any) => ({
            id: track.language,
            language: track.language,
            kind: "main",
          }));

        setAudioTracks(audioTracks);

        const buff = player.getBufferedInfo();
        console.log(buff);

        // setState((prev) => ({
        //   ...prev,
        //   availableQualities: qualities,
        //   availableCaptions: captions,
        //   availableAudioTracks: audioTracks,
        //   duration: videoRef.current?.duration || 0,
        // }));
      } catch (error) {
        console.error("Load error", error);
        setError(() => "Error loading video");
      }
    },
    [updateCurrentQuality, updateTracks]
  );

  // --- PLAYER CLEANUP ---
  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
    };
  }, []);

  return {
    initializePlayer,
    error,
    qualities,
    captions,
    audioTracks,
    selectedQualitie,
    isMuted,
    loading,
    bufferedRanges,
    duration,
    volume,
    seekTo,
    togglePlay,
    handleVolumeChange,
    isPlaying,
    currentTime,
    toggleMute,
    toggleFullscreen,
    isFullScreen,
    videoRef,
    containerRef,
  };
};




/*

  const setVolume = (volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = volume === 0;
    }
  };

 

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const setQuality = (quality: string) => {
    const player = playerRef.current;
    if (!player) return;

    if (quality === "auto") {
      player.configure({ abr: { enabled: true } });
    } else {
      const selected = state.availableQualities.find((q) => q.id === quality);
      if (selected) {
        player.configure({ abr: { enabled: false } });
        player.selectVariantTrack(selected);
      }
    }
  };

  const setCaption = (caption: string) => {
    const player = playerRef.current;
    if (!player) return;

    if (caption === "off") {
      player.setTextTrackVisibility(false);
    } else {
      const selected = state.availableCaptions.find((c) => c.id === caption);
      if (selected) {
        player.setTextTrackVisibility(true);
        player.selectTextTrack(selected);
      }
    }
  };

  const setAudioTrack = (track: string) => {
    const player = playerRef.current;
    if (!player) return;
    const selected = state.availableAudioTracks.find((a) => a.id === track);
    if (selected) player.selectAudioTrack(selected);
  };

  const toggleCaptions = () => {
    const player = playerRef.current;
    if (!player) return;
    const newState = !state.isCaptionsEnabled;
    player.setTextTrackVisibility(newState);
  };

  // --- THUMBNAIL PREVIEW ---
  const showThumbnailPreview = (time: number) => {
    const spriteBaseUrl = "/thumbnails/sprite.jpg";
    const index = Math.floor(time / 10);
    const previewUrl = `${spriteBaseUrl}#${index}`;
    setState((prev) => ({ ...prev, thumbnailPreviewUrl: previewUrl }));
  };

  // --- EVENT BINDINGS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const buffered = video.buffered;
      let bufferEnd = 0;
      if (buffered.length) {
        bufferEnd = buffered.end(buffered.length - 1);
      }
      const bufferProgress = (bufferEnd / video.duration) * 100;
      setState((prev) => ({
        ...prev,
        currentTime: video.currentTime,
        bufferProgress: isFinite(bufferProgress) ? bufferProgress : 0,
      }));
    };

    const handleVolume = () => {
      setState((prev) => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted,
      }));
    };

    const handlePlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const handlePause = () =>
      setState((prev) => ({ ...prev, isPlaying: false }));
    const handleEnded = () => setState((prev) => ({ ...prev, isEnded: true }));
    const handleWaiting = () =>
      setState((prev) => ({ ...prev, isBuffering: true }));
    const handlePlaying = () =>
      setState((prev) => ({ ...prev, isBuffering: false }));
    const handleDuration = () =>
      setState((prev) => ({ ...prev, duration: video.duration }));

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("volumechange", handleVolume);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("durationchange", handleDuration);
    video.addEventListener("progress", progress);
    video.addEventListener("loadedmetadata", progress);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("volumechange", handleVolume);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("durationchange", handleDuration);
    };
  }, []);


   */
