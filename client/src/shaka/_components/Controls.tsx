import { FullscreenIcon, PauseIcon, VolumeOffIcon } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Progress from "./Progress";
import { formatTime } from "../hooks/useShakaPlayer";
import { Icon } from "./icon";

export const PlayerControls = () => {
  const {
    duration,
    volume,
    isMuted,
    isPlaying,
    togglePlay,
    currentTime,
    toggleMute,
    toggleFullscreen,
    isFullScreen,
  } = usePlayer();

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 bg-red-700">
      <div className="h-14"></div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="text-white hover:text-gray-300 transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <Icon.PlayIcon className="w-6 h-6" />
          )}
        </button>

        <div className="text-white text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <button
          onClick={toggleMute}
          className="text-white hover:text-gray-300 transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeOffIcon className="w-5 h-5" />
          ) : volume < 0.5 ? (
            // <VolumeLowIcon className="w-5 h-5" />
            <>low</>
          ) : (
            // <VolumeHighIcon className="w-5 h-5" />
            <>high</>
          )}
        </button>

        <Progress />

        <button
          onClick={toggleFullscreen}
          className="text-white hover:text-gray-300 transition-colors"
        >
          {isFullScreen ? (
            // <FullscreenExitIcon className="w-5 h-5" />
            <>full screen</>
          ) : (
            <FullscreenIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
