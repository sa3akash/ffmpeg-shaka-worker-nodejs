// components/VideoPlayer/CaptionSelector.tsx
import React from 'react';
import { usePlayer } from '../context/PlayerContext';

const CaptionSelector: React.FC = () => {
  const { toggleCaption, captions } = usePlayer();

  if (captions.length === 0) return null;

  return (
    <div className="relative group">
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 rounded-md shadow-lg z-10 min-w-max">
        <div className="py-1">
          <button
            onClick={() => toggleCaption('off')}
            className={`block w-full px-4 py-2 text-sm text-left text-white hover:bg-gray-700 ${!captions.some(c=>c.active === true) ? 'bg-gray-700' : ''}`}
          >
            Off
          </button>
          {captions.map(caption => (
            <button
              key={caption.id}
              onClick={() => toggleCaption(caption.id)}
              className={`block w-full px-4 py-2 text-sm text-left text-white hover:bg-gray-700 ${caption.active ? 'bg-gray-700' : ''}`}
            >
              {caption.language} ({caption.kind})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaptionSelector;