/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useRef } from "react";
// import "shaka-player/dist/controls.css";
const shaka = require("shaka-player/dist/shaka-player.compiled.js");

export const useShakaPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // const playerRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;
    const player = new shaka.Player(videoElement);

    //Setting up shaka player UI
    // const ui = new shaka.ui.Overlay(player, containerRef.current, videoElement);
    // ui.configure(uiConfig); //configure UI
    // ui.getControls();

    player.configure({
      drm: {
        clearKeys: {
          "7f013862bf2e85c920b9de743ab0a596":
            "77e694b04d99d7b9727d9c6800c14379",
        },
      },
    });

    player
      .load("http://localhost:5000/output/song/video/lock/master.m3u8")
      // .load("http://localhost:5000/output/song/video/lock/manifest.mpd")
      // .load("http://localhost:5000/output/en/master.m3u8")
      // .load("https://sa2uploads.t3.storage.dev/processed/full-video-raanjhan-do-patti-kriti-sanon-shaheer-sheikh-parampara-tandon-sachet-parampara/dash/manifest.mpd")
      // .load("https://sa2uploads.t3.storage.dev/processed/new-tesing-vidop/dash/manifest.mpd")
      .then(() => {
        const tracks = player.getVariantTracks();
        console.log({ resulation: tracks });
        const textTracks = player.getTextTracks();
        console.log({ textTracks });

        console.log("The video has now been loaded!");
        player.addTextTrack(
          "https://sa2uploads.t3.storage.dev/processed/new-tesing-vidop/thumbnails/thumbs-0.vtt",
          "thumbnails",
          "en",
          "vtt",
          "metadata"
        );
      })
      .catch((err: string) => {
        console.log(err);
      });
  }, []);

  return {
    videoRef,
    containerRef,
  };
};
