import express from "express";
import { globalErrorHandler } from "error-express";
import path from "path";
import { TranscodeVideo } from "./transcoder";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Range");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range");
  next();
});

app.use(express.static(path.join(__dirname, "../public")));

async function main() {

  const outputDirMain = path.join(__dirname, "../public", "output", "song");

  const video = new TranscodeVideo("video", outputDirMain);

  await video.transcode();

  console.log("✅ All done. Check the output folder.");
}

main().catch(console.error);

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use(globalErrorHandler);

app.listen(5000, () => {
  console.log(`server running on http://localhost:5000`);
});

// =====================

// ✅ VMAP with preroll and midroll
app.get("/vmap.xml", (req, res) => {
  res.set("Content-Type", "application/xml");

  const vmapXml = `<?xml version="1.0" encoding="UTF-8"?>
<VMAP xmlns="http://www.iab.net/videosuite/vmap" version="1.0">
  <AdBreak timeOffset="start" breakType="linear" breakId="preroll-1">
    <AdSource id="ad-preroll" allowMultipleAds="false" followRedirects="true">
      <AdTagURI templateType="vast3"><![CDATA[http://localhost:5000/vast/preroll.xml]]></AdTagURI>
    </AdSource>
  </AdBreak>
  <AdBreak timeOffset="00:00:20.000" breakType="linear" breakId="midroll-1">
    <AdSource id="ad-midroll" allowMultipleAds="false" followRedirects="true">
      <AdTagURI templateType="vast3"><![CDATA[http://localhost:5000/vast/midroll.xml]]></AdTagURI>
    </AdSource>
  </AdBreak>
</VMAP>`;
  res.send(vmapXml);
});

// ✅ VAST for preroll
app.get("/vast/preroll.xml", (req, res) => {
  res.set("Content-Type", "application/xml");

  const vast = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="1">
    <InLine>
      <AdSystem>SelfHost</AdSystem>
      <AdTitle>My Pre-roll Ad</AdTitle>
      <Impression><![CDATA[http://localhost:5000/impression/preroll]]></Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:10</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720">
                <![CDATA[http://localhost:5000/1.mp4]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;
  res.send(vast);
});

// ✅ VAST for midroll
app.get("/vast/midroll.xml", (req, res) => {
  res.set("Content-Type", "application/xml");

  const vast = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="2">
    <InLine>
      <AdSystem>SelfHost</AdSystem>
      <AdTitle>My Mid-roll Ad</AdTitle>
      <Impression><![CDATA[http://localhost:5000/impression/midroll]]></Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:10</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720">
                <![CDATA[http://localhost:5000/2.mp4]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;
  res.send(vast);
});

// Optional: Impression endpoint (mock tracking)
app.get("/impression/:type", (req, res) => {
  console.log(`🔎 Impression tracked: ${req.params.type}`);
  res.sendStatus(204); // No content
});
