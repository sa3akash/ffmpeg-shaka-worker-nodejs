import { usePlayer } from "../context/PlayerContext";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export const VideoPlayer = ({ poster, className }: VideoPlayerProps) => {
  const { videoRef } = usePlayer();

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      playsInline
    />
  );
};