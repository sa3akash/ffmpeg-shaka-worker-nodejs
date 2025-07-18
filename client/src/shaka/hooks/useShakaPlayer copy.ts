/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { ShakaPlayerConfig } from "../types/shaka";

interface QualityOption {
  id: string;
  height: number;
  bandwidth: number;
  active?: boolean;
}

interface CaptionOption {
  id: string;
  language: string;
  kind: string;
  active?: boolean;
}

interface AudioTrackOption {
  id: string;
  language: string;
  kind: string;
  active?: boolean;
}

interface Chapter {
  startTime: number;
  endTime: number;
  title: string;
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
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [captions, setCaptions] = useState<CaptionOption[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState<number>(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout>(undefined);

  // --- PLAYER CONTROLS ---

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pause();
      } else {
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError("Failed to play video");
    }
  }, [isPlaying]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current || isNaN(time)) return;
    videoRef.current.currentTime = time;
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    videoRef.current.muted = newVolume === 0;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullScreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullScreen]);

  const seekToChapter = useCallback(
    (startTime: number) => {
      seekTo(startTime);
    },
    [seekTo]
  );

  const skipBackward = useCallback(
    (seconds = 15) => {
      if (!videoRef.current) return;
      seekTo(Math.max(0, videoRef.current.currentTime - seconds));
    },
    [seekTo]
  );

  const skipForward = useCallback(
    (seconds = 15) => {
      if (!videoRef.current) return;
      seekTo(Math.min(duration, videoRef.current.currentTime + seconds));
    },
    [duration, seekTo]
  );

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const selectQuality = useCallback((qualityId: string) => {
    if (!playerRef.current) return;

    try {
      const tracks = playerRef.current.getVariantTracks();

      if (qualityId === "auto") {
        playerRef.current.configure({ abr: { enabled: true } });
        setSelectedQuality("auto");
        return;
      }

      const selectedTrack = tracks.find(
        (track: any) =>
          `${track.height}p` === qualityId || track.id === qualityId
      );

      if (selectedTrack) {
        playerRef.current.configure({ abr: { enabled: false } });
        playerRef.current.selectVariantTrack(selectedTrack, true);
        setSelectedQuality(qualityId);
      }
    } catch (error) {
      console.error("Error changing quality:", error);
    }
  }, []);

  const toggleCaption = useCallback((captionId: string) => {
    if (!playerRef.current) return;

    try {
      const textTracks = playerRef.current.getTextTracks();
      const selectedTrack = textTracks.find(
        (track: any) => track.language + "-" + track.kind === captionId
      );

      if (selectedTrack) {
        // Toggle the selected caption track
        const isActive = selectedTrack.active;
        playerRef.current.setTextTrackVisibility(!isActive);

        // Update captions state
        setCaptions((prev) =>
          prev.map((caption) => ({
            ...caption,
            active: caption.id === captionId ? !isActive : false,
          }))
        );
      }
    } catch (error) {
      console.error("Error toggling caption:", error);
    }
  }, []);

  const selectAudioTrack = useCallback((audioTrackId: string) => {
    if (!playerRef.current) return;

    try {
      const audioTracks = playerRef.current.getVariantTracks();
      const selectedTrack = audioTracks.find(
        (track: any) => track.language === audioTrackId
      );

      if (selectedTrack) {
        playerRef.current.selectAudioLanguage(selectedTrack.language);

        // Update audio tracks state
        setAudioTracks((prev) =>
          prev.map((track) => ({
            ...track,
            active: track.id === audioTrackId,
          }))
        );
      }
    } catch (error) {
      console.error("Error changing audio track:", error);
    }
  }, []);

  const updateTracks = useCallback(() => {
    if (!playerRef.current) return;

    try {
      // Update subtitle tracks
      const textTracks = playerRef.current.getTextTracks();
      const subtitles = textTracks.map((track: any) => ({
        id: track.language + "-" + track.kind,
        language: track.language || "unknown",
        kind: track.kind,
        active: track.active || false,
      }));
      setCaptions(subtitles);

      // Update video quality tracks
      const variantTracks = playerRef.current.getVariantTracks();
      const videoQualities = variantTracks
        .filter((track: any) => track.videoCodec)
        .map((track: any) => ({
          id: `${track.height}p`,
          height: track.height || 0,
          bandwidth: track.bandwidth || 0,
          active: track.active || false,
        }))
        .sort((a: any, b: any) => b.height - a.height);

      setQualities(videoQualities);

      // Update audio tracks
      const audioTracks = variantTracks
        .filter(
          (v: any, i: number, self: any[]) =>
            self.findIndex((t) => t.language === v.language) === i
        )
        .map((track: any) => ({
          id: track.language,
          language: track.language,
          kind: "main",
          active: track.active || false,
        }));

      setAudioTracks(audioTracks);
    } catch (error) {
      console.error("Error updating tracks:", error);
    }
  }, []);

  const updateCurrentQuality = useCallback(() => {
    if (!playerRef.current) return;
    try {
      const tracks = playerRef.current.getVariantTracks();
      const activeTrack = tracks.find((track: any) => track.active);

      if (activeTrack) {
        setSelectedQuality(`${activeTrack.height}p`);
      }
    } catch (error) {
      console.error("Error updating quality:", error);
    }
  }, []);

  const extractChapters = useCallback((manifest: any) => {
    if (!manifest) return [];

    const chapters: Chapter[] = [];
    if (manifest.periods && manifest.periods[0].eventStreams) {
      for (const eventStream of manifest.periods[0].eventStreams) {
        if (
          eventStream.schemeIdUri === "urn:mpeg:dash:event:2012" ||
          eventStream.schemeIdUri === "urn:com:youtube:dash:chapters:1"
        ) {
          for (const event of eventStream.events) {
            chapters.push({
              startTime: event.presentationTime,
              endTime: event.presentationTime + (event.duration || 10),
              title: event.message || `Chapter ${chapters.length + 1}`,
            });
          }
        }
      }
    }

    return chapters;
  }, []);

  // --- PLAYER INITIALIZATION ---
  const initializePlayer = useCallback(
    async (url: string, config: Partial<ShakaPlayerConfig> = {}) => {
      setError(null);
      setLoading(true);

      try {
        const shaka: ShakaPlayerType =
          await require("shaka-player/dist/shaka-player.compiled.js");

        if (!videoRef.current) return;

        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          setError("Browser not supported");
          return;
        }

        const player = new shaka.Player(videoRef.current);
        playerRef.current = player;

        // Event listeners
        player.addEventListener("trackschanged", () => {
          updateTracks();
          updateCurrentQuality();
        });

        player.addEventListener("adaptation", () => {
          updateCurrentQuality();
        });

        player.addEventListener("buffering", (event: any) => {
          setLoading(event.buffering);
        });

        player.addEventListener("error", (error: any) => {
          console.error("Shaka error", error);
          setError(`Error: ${error?.detail?.message || "Unknown"}`);
        });

        player.addEventListener("manifestparsed", (event: any) => {
          const chapters = extractChapters(event.data);
          setChapters(chapters);
        });

        // Configure player
        player.configure({
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 2,
            bufferBehind: 30,
            ignoreTextStreamFailures: true,
          },
          abr: { enabled: true },
          ...config,
        });

        await player.load(url);
        setLoading(false);

        // Initialize tracks and quality
        updateTracks();
        updateCurrentQuality();

        // Set initial volume
        if (videoRef.current) {
          setVolume(videoRef.current.volume);
          setIsMuted(videoRef.current.muted);
        }
      } catch (error) {
        console.error("Player initialization error:", error);
        setError("Error initializing player");
        setLoading(false);
      }
    },
    [extractChapters, updateCurrentQuality, updateTracks]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, videoRef.current.currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(Math.min(duration, videoRef.current.currentTime + 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange([Math.min(1, volume + 0.1)]);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange([Math.max(0, volume - 0.1)]);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    },
    [
      togglePlay,
      seekTo,
      duration,
      handleVolumeChange,
      volume,
      toggleMute,
      toggleFullscreen,
    ]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleDurationChange = () => {
      console.log("handleDurationChange");
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // startTimeUpdateInterval();
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

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(duration);
    };

    const handleMetadata = () => {
      setDuration(video.duration)
    };
    const handleProgress = () => {
      const ranges: BufferedRange[] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBufferedRanges(ranges);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      console.log("handleTimeUpdate");
    };

    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("progress", handleProgress);

    video.addEventListener("loadeddata", (e) => {
      console.log("loadeddata", e);
    });
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ratechange", (e) => {
      console.log("ratechange", e);
    });

    video.addEventListener("timeupdate", handleTimeUpdate);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("keydown", handleKeyDown);

    video.addEventListener("loadedmetadata", handleMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("keydown", handleKeyDown);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [duration, handleKeyDown]);

  // --- PLAYER CLEANUP ---
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const interval = updateIntervalRef.current;
      if (interval) {
        clearInterval(interval);
      }
      playerRef.current?.destroy?.();
    };
  }, []);

  return {
    // Player state
    error,
    isPlaying,
    isMuted,
    loading,
    isFullScreen,
    currentTime,
    duration,
    volume,
    playbackRate,
    bufferedRanges,
    qualities,
    selectedQuality,
    captions,
    audioTracks,
    chapters,
    currentChapter,

    // Player refs
    videoRef,
    containerRef,

    // Player controls
    initializePlayer,
    togglePlay,
    seekTo,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    skipBackward,
    skipForward,
    seekToChapter,
    changePlaybackRate,
    selectQuality,
    toggleCaption,
    selectAudioTrack,
    setVolume
  };
};
