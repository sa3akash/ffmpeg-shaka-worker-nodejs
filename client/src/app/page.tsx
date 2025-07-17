"use client";

import dynamic from "next/dynamic";

const ShakaPlayer = dynamic(() => import("@/shaka/ShakaPlayer"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="h-screen flex justify-center items-center">
      {/* <VideoPlayer
        src="http://localhost:5000/output/package/dash/manifest.mpd"
       
      /> */}

      {/* <VideoJSPlayer /> */}

      <ShakaPlayer />
    </div>
  );
}
