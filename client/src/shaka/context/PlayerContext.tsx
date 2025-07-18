import React, { createContext, useContext, ReactNode } from "react";
import { useShakaPlayer } from "../hooks/useShakaPlayer";

type PlayerContextType = ReturnType<typeof useShakaPlayer>;

const PlayerContext = createContext<PlayerContextType | null>(null);



type VideoPlayerContextProps = {
  children: ReactNode;
};

export const PlayerProvider: React.FC<VideoPlayerContextProps> = ({
  children,
}) => {
  const value = useShakaPlayer();

  return (
    <PlayerContext.Provider value={value}>
      <div ref={value.containerRef} className="w-full" style={{maxWidth:"1200px"}}>{children}</div>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
