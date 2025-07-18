"use client";

import React, { useEffect } from "react";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";

import { PlayerControls } from "./_components/Controls";
import { PlayerConfiguration } from "./types/shaka-player";

export interface VideoPlayerProps {
  url: string;
  posterUrl?: string;
  configuration?: PlayerConfiguration;
}

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  return (
    <PlayerProvider>
      <Wrapper {...props} />
    </PlayerProvider>
  );
};

export default VideoPlayer;

const Wrapper: React.FC<VideoPlayerProps> = ({ posterUrl, ...props }) => {
  const { initializePlayer, videoRef } = usePlayer();

  useEffect(() => {
    initializePlayer(props.url, props.configuration);
  }, [initializePlayer, props.configuration, props.url]);

  return (
    <div className="relative w-full mx-auto bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={posterUrl}
        playsInline
      />

      <div className="absolute inset-0 flex flex-col justify-between opacity-0 hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/70 to-transparent">
        <div className="p-4">
          <div className="flex justify-end space-x-2">
            {/* <QualitySelector />
              <CaptionSelector />
              <AudioTrackSelector />  */}
          </div>
        </div>

        <PlayerControls />
      </div>
    </div>
  );
};
