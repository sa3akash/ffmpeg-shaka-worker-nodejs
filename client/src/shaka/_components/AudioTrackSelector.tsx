// components/VideoPlayer/AudioTrackSelector.tsx
import React from 'react';
import { usePlayer } from '../context/PlayerContext';

const AudioTrackSelector: React.FC = () => {
  const { audioTracks,selectAudioTrack } = usePlayer();

  if (audioTracks.length <= 1) return null;

  return (
    <div className="relative group">
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 rounded-md shadow-lg z-10 min-w-max">
        <div className="py-1">
          {audioTracks.map(track => (
            <button
              key={track.id}
              onClick={() => selectAudioTrack(track.id)}
              className={`block w-full px-4 py-2 text-sm text-left text-white hover:bg-gray-700 ${track.active ? 'bg-gray-700' : ''}`}
            >
              {track.language}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioTrackSelector;