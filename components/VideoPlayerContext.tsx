import { createContext, useContext, useRef } from "react";
import type Player from "video.js/dist/types/player";

type VideoPlayerContextType = {
  playerRef: React.RefObject<Player | null>;
};

export const VideoPlayerContext = createContext<VideoPlayerContextType>({
  playerRef: { current: null },
});

export const useVideoPlayerContext = () => useContext(VideoPlayerContext);
