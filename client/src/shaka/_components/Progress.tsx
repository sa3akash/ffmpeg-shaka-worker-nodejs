import React, { useCallback, useRef, useState, useEffect } from "react";
import { formatTime } from "../hooks/useShakaPlayer";
import { usePlayer } from "../context/PlayerContext";

const Progress = () => {
  const progressRef = useRef<HTMLDivElement>(null);
  const { duration, bufferedRanges, currentTime, seekTo } = usePlayer();

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);

  // Calculate total buffered percentage
  // const getBufferedPercentage = useCallback(() => {
  //   if (!duration || bufferedRanges.length === 0) return 0;
  //   const last = bufferedRanges[bufferedRanges.length - 1];
  //   return Math.min((last.end / duration) * 100, 100);
  // }, [bufferedRanges, duration]);

  // Handle mouse movement for hover preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percentage = x / rect.width;
      setHoverTime(percentage * duration);
      setHoverX(x);
      
      // If seeking (mouse down), update preview
      if (isSeeking) {
        setSeekPreviewTime(percentage * duration);
      }
    },
    [duration, isSeeking]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isSeeking) {
      setHoverTime(null);
      setHoverX(null);
    }
  }, [isSeeking]);

  // Start seeking (mouse down)
  const handleMouseDown = useCallback(() => {
    setIsSeeking(true);
  }, []);

  // End seeking (mouse up)
  // const handleMouseUp = useCallback(() => {
  //   if (isSeeking && seekPreviewTime !== null) {
  //     seekTo(seekPreviewTime);
  //   }
  //   setIsSeeking(false);
  //   setSeekPreviewTime(null);
  // }, [isSeeking, seekPreviewTime, seekTo]);

  // Handle click for quick seeking
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!progressRef.current || duration <= 0) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      seekTo(percentage * duration);
    },
    [seekTo, duration]
  );

  // Add global mouse up listener for seeking
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSeeking) {
        setIsSeeking(false);
        if (seekPreviewTime !== null) {
          seekTo(seekPreviewTime);
        }
        setSeekPreviewTime(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSeeking, seekPreviewTime, seekTo]);

  // Calculate the current time to display (either hover, seek preview, or actual)
  const displayTime = isSeeking ? seekPreviewTime : hoverTime;
  const displayPercentage = isSeeking && seekPreviewTime !== null 
    ? (seekPreviewTime / duration) * 100 
    : (currentTime / duration) * 100;

  return (
    <div
      className="relative w-full h-3 group cursor-pointer"
      ref={progressRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-label="Video progress"
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-gray-700 rounded-full overflow-hidden">
        {/* Buffered segments */}
        {bufferedRanges.map((range, i) => {
          const start = (range.start / duration) * 100;
          const end = (range.end / duration) * 100;
          return (
            <div
              key={`buffered-${i}`}
              className="absolute top-0 h-full bg-gray-400"
              style={{ left: `${start}%`, width: `${end - start}%` }}
            />
          );
        })}

        {/* Played segment */}
        <div
          className="absolute top-0 h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${displayPercentage}%` }}
        />

        {/* Seek preview overlay (during seeking) */}
        {isSeeking && seekPreviewTime !== null && (
          <div
            className="absolute top-0 h-full bg-blue-400 opacity-50"
            style={{ width: `${(seekPreviewTime / duration) * 100}%` }}
          />
        )}
      </div>

      {/* Thumb/puck */}
      <div
        className="absolute top-1/2 w-3 h-3 bg-blue-500 rounded-full transform -translate-y-1/2 transition-all duration-100 opacity-0 group-hover:opacity-100"
        style={{ left: `${displayPercentage}%`, marginLeft: '-0.375rem' }}
      />

      {/* Hover/seek tooltip */}
      {displayTime !== null && hoverX !== null && (
        <div
          className="absolute -top-8 text-xs text-white px-2 py-1 bg-black rounded shadow-sm pointer-events-none transform -translate-x-1/2"
          style={{ left: `${hoverX}px` }}
        >
          {formatTime(displayTime)}
        </div>
      )}

      {/* Hidden range input for better accessibility */}
      <input
        type="range"
        min="0"
        max={duration}
        value={currentTime}
        onChange={(e) => seekTo(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-hidden="true"
      />
    </div>
  );
};

export default React.memo(Progress);