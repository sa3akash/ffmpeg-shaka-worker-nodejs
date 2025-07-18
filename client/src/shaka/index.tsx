"use client";

import React, { useEffect } from "react";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";

import { PlayerControls } from "./_components/Controls";

export interface VideoPlayerProps {
  url: string;
  posterUrl?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, posterUrl }) => {
  return (
    <PlayerProvider>
      <Wrapper url={url} posterUrl={posterUrl} />
    </PlayerProvider>
  );
};

export default VideoPlayer;

const Wrapper: React.FC<VideoPlayerProps> = ({ url, posterUrl }) => {
  const { videoRef, initializePlayer } = usePlayer();

  useEffect(() => {
    initializePlayer(url, {});
  }, [initializePlayer, url]);

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
