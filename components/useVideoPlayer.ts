/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-thumbnails";
import "videojs-contrib-quality-levels";
import "videojs-http-source-selector";
import type Player from "video.js/dist/types/player";

import "videojs-contrib-eme";

// Optional: Register manually if needed
if (!videojs.use) {
  require("videojs-contrib-eme")(videojs);
}

export const useVideoPlayer = (
  options: any,
  onReady?: (player: any) => void
) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;
    const player = videojs(videoElement, options, () => {
      onReady?.(player);
    }) as any;

    playerRef.current = player;

    return () => {
      player.dispose();
    };
  }, [onReady, options]);

  return { videoRef, playerRef };
};
