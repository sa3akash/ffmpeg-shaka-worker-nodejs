import React, { createContext, useContext, ReactNode } from "react";
import { usePlayerControlls } from "../hooks/usePlayerControlls";

type PlayerContextType = ReturnType<typeof usePlayerControlls>;
const PlayerContext = createContext<PlayerContextType | null>(null);

type VideoPlayerContextProps = {
  children: ReactNode;
};

export const PlayerProvider: React.FC<VideoPlayerContextProps> = ({
  children,
}) => {
  const value = usePlayerControlls();

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
