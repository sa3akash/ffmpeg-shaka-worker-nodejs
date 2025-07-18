// components/VideoPlayer/QualitySelector.tsx
import React from "react";
import { usePlayer } from "../context/PlayerContext";

const QualitySelector: React.FC = () => {
  const { selectQuality, selectedQuality, qualities } = usePlayer();

  if (qualities.length === 0) return null;

  return (
    <div className="relative group">
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 rounded-md shadow-lg z-10 min-w-max">
        <div className="py-1">
          <button
            onClick={() => selectQuality("auto")}
            className={`block w-full px-4 py-2 text-sm text-left text-white hover:bg-gray-700 ${
              selectedQuality === "auto" ? "bg-gray-700" : ""
            }`}
          >
            Auto
          </button>
          {qualities.map((quality) => (
            <button
              key={quality.id}
              onClick={() => selectQuality(quality.id)}
              className={`block w-full px-4 py-2 text-sm text-left text-white hover:bg-gray-700 ${
                quality.active ? "bg-gray-700" : ""
              }`}
            >
              {quality.height}p
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QualitySelector;
