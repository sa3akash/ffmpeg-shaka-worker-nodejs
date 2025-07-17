"use client";

import { useVideoPlayer } from "./useVideoPlayer";
import { VideoPlayerContext } from "./VideoPlayerContext";

// const keyId = "jla3qyHIdGvs8tPwoSP5hQ=="; // hex (lowercase)
// const key = "3D3ILSTmFuaG1rCjTq/u4g=="; // hex
const keyId = "a687a3d6d3165e858ed8393a94a6d24c"; // hex (lowercase)
const key = "b928f63e78334460c973432a033551e4"; // hex

const keySystems = {
  "org.w3.clearkey": {
    keys: [
      {
        keyId: keyId,
        key: key,
      },
    ],
  },
};

const sources = [
  // {
  //   src: "http://localhost:5000/output/package/hls/master.m3u8",
  //   type: "application/x-mpegURL",
  //   keySystems
  // },
  {
    src: "http://localhost:5000/output/un/manifest.mpd",
    type: "application/dash+xml",
    // keySystems,
  },
];

const subtitles = [
  { src: "/subtitles/en.vtt", label: "English", srclang: "en", default: true },
  { src: "/subtitles/es.vtt", label: "Spanish", srclang: "es" },
];

export const VideoJSPlayer = () => {
  const { videoRef, playerRef } = useVideoPlayer(
    {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      techOrder: ["html5"],
      preload: "auto",
      //   poster: "/poster.jpg",
      sources,
      tracks: subtitles.map((sub) => ({
        kind: "subtitles",
        ...sub,
      })),
    },
    (player) => {}
  );

  return (
    <VideoPlayerContext.Provider value={{ playerRef }}>
      <div className="w-5xl">
        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-big-play-centered" />
        </div>
      </div>
    </VideoPlayerContext.Provider>
  );
};
