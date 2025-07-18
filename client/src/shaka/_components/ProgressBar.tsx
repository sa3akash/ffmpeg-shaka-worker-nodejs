// components/VideoPlayer/ProgressBar.tsx
import React, { useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, seekTo }) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  const handleMouseDown = () => {
    setIsSeeking(true);
  };

  const handleMouseUp = () => {
    setIsSeeking(false);
    seekTo(seekTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    const time = percent * duration;
    setSeekTime(time);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    const time = percent * duration;
    seekTo(time);
  };

  const progress = isSeeking ? (seekTime / duration) * 100 : (currentTime / duration) * 100;

  return (
    <div
      className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={() => setIsSeeking(false)}
    >
      <div
        className="h-full bg-red-600 rounded-full relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-red-600 rounded-full"></div>
      </div>
    </div>
  );
};

export default ProgressBar;