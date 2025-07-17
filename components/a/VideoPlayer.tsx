"use client";
import { useEffect, useRef, useState } from "react";
import shaka from "shaka-player/dist/shaka-player.compiled";
import "shaka-player/dist/controls.css";

export default function ShakaPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<shaka.Player | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check browser support first
    if (!shaka.Player.isBrowserSupported()) {
      setError("Browser not supported");
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Initialize player
    const player = new shaka.Player();
    playerRef.current = player;

    const initializePlayer = async () => {
      try {
        // 1. First attach to video element
        await player.attach(videoElement);

        // 2. Configure ClearKey DRM
        player.configure({
          drm: {
            clearKeys: {
              "8f24393d268da69dfa3aa6a9c352fc26": "959107d4f9376ffb97f063b669578a2f",
            },
          }
        });

        // 3. Load the manifest
        await player.load(src);
        setError(""); // Clear any previous errors

        // Optional: Debugging
        player.addEventListener('error', (err) => {
          console.error('Player error:', err);
        });
      } catch (error) {
        console.error("Initialization failed:", error);
        setError(`Playback error: ${error}`);
      }
    };

    initializePlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.detach();
        playerRef.current.destroy();
      }
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        muted // Required for autoplay in most browsers
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4">
          <div className="text-center">
            <p className="font-bold">Playback Error</p>
            <p className="text-sm mb-2">{error}</p>
            <button
              className="px-3 py-1 bg-blue-600 rounded text-sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}