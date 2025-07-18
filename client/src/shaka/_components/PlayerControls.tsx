// components/VideoPlayer/PlayerControls.tsx
import React from 'react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import FullScreenButton from './FullScreenButton';
import { usePlayer } from '../context/PlayerContext';

const PlayerControls: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    togglePlay,
    seekTo,
    toggleMute,
  setVolume,
  changePlaybackRate
  } = usePlayer();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="p-4">
      <ProgressBar currentTime={currentTime} duration={duration} seekTo={seekTo} />
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <VolumeControl volume={volume} isMuted={isMuted} setVolume={setVolume} toggleMute={toggleMute} />
          
          <div className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <button className="text-white hover:text-gray-300 transition-colors">
              <span className="text-sm">{playbackRate}x</span>
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 rounded-md shadow-lg z-10">
              {playbackRates.map(rate => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  className={`block w-full px-4 py-2 text-sm text-white hover:bg-gray-700 ${playbackRate === rate ? 'bg-gray-700' : ''}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          
          <FullScreenButton />
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;