import VideoPlayer from "@/shaka";

// const ShakaPlayer = dynamic(() => import("@/shaka/ShakaPlayer"), {
//   ssr: false,
// });

export default function Home() {
  return (
    <div className="h-screen flex justify-center items-center">
      {/* <VideoPlayer
        src="http://localhost:5000/output/package/dash/manifest.mpd"
       
      /> */}

      {/* <VideoJSPlayer /> */}

      {/* <ShakaPlayer /> */}
      <VideoPlayer
        url="http://localhost:5000/output/song/video/free/manifest.mpd"
        configuration={{
          drm: {
       
          },
        }}
      />
    </div>
  );
}
