/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useShakaPlayer } from "./useShakaPlayer";

type BufferedRange = { start: number; end: number };

export const usePlayerControlls = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState<number>(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

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
  }, [isPlaying, setError, videoRef]);

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

  const seekTo = useCallback(
    (time: number) => {
      if (!videoRef.current || isNaN(time)) return;
      videoRef.current.currentTime = time;
    },
    [videoRef]
  );

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      if (!videoRef.current) return;
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    },
    [videoRef]
  );

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
    [seekTo, videoRef]
  );

  const skipForward = useCallback(
    (seconds = 15) => {
      if (!videoRef.current) return;
      seekTo(Math.min(duration, videoRef.current.currentTime + seconds));
    },
    [duration, seekTo, videoRef]
  );

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, [videoRef]);

  const changePlaybackRate = useCallback(
    (rate: number) => {
      if (!videoRef.current) return;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    },
    [videoRef]
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
      videoRef,
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
      setDuration(video.duration);
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
  }, [duration, handleKeyDown, setError, setLoading, videoRef]);

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
