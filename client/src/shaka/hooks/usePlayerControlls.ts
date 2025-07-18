import { useCallback, useEffect, useRef, useState } from "react";
import { useShakaPlayer } from "./useShakaPlayer";

type BufferedRange = { start: number; end: number };

export const usePlayerControlls = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const {
    videoRef,
    audioTracks,
    captions,
    chapters,
    setError,
    error,
    initializePlayer,
    loading,
    qualities,
    selectAudioTrack,
    selectQuality,
    selectedQuality,
    toggleCaption,
    setLoading,
  } = useShakaPlayer();

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError("Failed to play video");
    }
  }, [videoRef, setError]);

  // Seek to time
  const seekTo = useCallback(
    (time: number) => {
      if (videoRef.current && !isNaN(time)) {
        videoRef.current.currentTime = time;
      }
    },
    [videoRef]
  );

  // Skip forward/backward
  const skip = useCallback(
    (offset: number) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = Math.min(Math.max(video.currentTime + offset, 0), duration);
      seekTo(newTime);
    },
    [seekTo, duration, videoRef]
  );

  const skipForward = useCallback(() => skip(15), [skip]);
  const skipBackward = useCallback(() => skip(-15), [skip]);

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0];
      const video = videoRef.current;
      if (!video) return;

      video.volume = newVolume;
      video.muted = newVolume === 0;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    },
    [videoRef]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const changePlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setPlaybackRate(rate);
    },
    [videoRef]
  );

  const seekToChapter = useCallback((startTime: number) => {
    seekTo(startTime);
  }, [seekTo]);

  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
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
      skipBackward,
      skipForward,
      handleVolumeChange,
      volume,
      toggleMute,
      toggleFullscreen,
    ]
  );

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };
    const onProgress = () => {
      const ranges: BufferedRange[] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBufferedRanges(ranges);
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(duration);
    };
    const onError = () => {
      setError("Video playback error");
    };

    const onTimeUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setCurrentTime(video.currentTime);
      });
    };

    // Add event listeners
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTimeUpdate);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTimeUpdate);
      document.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, handleKeyDown, duration, setError, setLoading]);

  return {
    togglePlay,
    seekTo,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    skipBackward,
    skipForward,
    seekToChapter,
    changePlaybackRate,
    toggleCaption,
    initializePlayer,
    selectAudioTrack,
    selectQuality,
    volume,
    audioTracks,
    captions,
    chapters,
    error,
    loading,
    qualities,
    selectedQuality,
    isPlaying,
    isFullScreen,
    currentTime,
    duration,
    playbackRate,
    bufferedRanges,
    isMuted,
    containerRef,
    videoRef,
  };
};
