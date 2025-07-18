/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ShakaStatic,
  Player,
  PlayerConfiguration,
} from "../types/shaka-player";

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

export const useShakaPlayer = () => {
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [captions, setCaptions] = useState<CaptionOption[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const [chapters, setChapters] = useState<Chapter[]>([]);

  const playerRef = useRef<Player>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        (track) =>
          `${track.height}p` === qualityId || `${track.id}` === `${qualityId}`
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
        (track) => track.language + "-" + track.kind === captionId
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
        (track) => track.language === audioTrackId
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
      const subtitles = textTracks.map((track) => ({
        id: track.language + "-" + track.kind,
        language: track.language || "unknown",
        kind: track.kind,
        active: track.active || false,
      }));
      setCaptions(subtitles);

      // Update video quality tracks
      const variantTracks = playerRef.current.getVariantTracks();
      const videoQualities = variantTracks
        .filter((track) => track.videoCodec)
        .map((track) => ({
          id: `${track.height}p`,
          height: track.height || 0,
          bandwidth: track.bandwidth || 0,
          active: track.active || false,
        }))
        .sort((a, b) => b.height - a.height);

      setQualities(videoQualities);

      // Update audio tracks
      const audioTracks = variantTracks
        .filter(
          (v, i: number, self) =>
            self.findIndex((t) => t.language === v.language) === i
        )
        .map((track) => ({
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
      const activeTrack = tracks.find((track) => track.active);

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
    async (url: string, config: PlayerConfiguration = {}) => {
      setError(null);
      setLoading(true);

      try {
        const shaka: ShakaStatic =
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

        player.addEventListener("buffering", (event) => {
          setLoading(event.buffering);
        });

        player.addEventListener("error", (error) => {
          console.error("Shaka error", error);
          setError(`Error: ${error?.detail?.message || "Unknown"}`);
        });

        player.addEventListener("manifestparsed", (event) => {
          const chapters = extractChapters(event.data);
          setChapters(chapters);
        });

        // Configure player
        player.configure({
          streaming: {
            bufferingGoal: 40,
            rebufferingGoal: 20,       
          },
          manifest: {
            retryParameters: {
              timeout: 60000, // in ms
              maxAttempts: 3,
            },
          },
          preferredAudioLanguage: "en",
          preferredTextLanguage: "en",
          abr: { enabled: true },
          ...config,
        });

        await player.load(url);
        setLoading(false);

        // Initialize tracks and quality
        updateTracks();
        updateCurrentQuality();
      } catch (error) {
        console.error("Player initialization error:", error);
        setError("Error initializing player");
        setLoading(false);
      }
    },
    [extractChapters, updateCurrentQuality, updateTracks]
  );

  // --- PLAYER CLEANUP ---
  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
    };
  }, []);

  return {
    // Player state
    error,
    loading,

    qualities,
    selectedQuality,
    captions,
    audioTracks,
    chapters,

    // Player refs
    videoRef,
    playerRef,

    // Player controls
    initializePlayer,

    selectQuality,
    toggleCaption,
    selectAudioTrack,
    setError,
    setLoading,
  };
};
