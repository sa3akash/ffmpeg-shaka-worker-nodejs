"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const error_express_1 = require("error-express");
const path_1 = __importDefault(require("path"));
const transcoder_1 = require("./transcoder");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Range");
    res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const outputDirMain = path_1.default.join(__dirname, "../public", "output", "song");
        const video = new transcoder_1.TranscodeVideo("video", outputDirMain);
        yield video.transcode();
        console.log("✅ All done. Check the output folder.");
    });
}
main().catch(console.error);
app.get("/", (_, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.use(error_express_1.globalErrorHandler);
app.listen(5000, () => {
    console.log(`server running on http://localhost:5000`);
});
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
app.get("/impression/:type", (req, res) => {
    console.log(`🔎 Impression tracked: ${req.params.type}`);
    res.sendStatus(204);
});
//# sourceMappingURL=worker.js.map