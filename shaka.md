Here's a comprehensive list of **all major features and methods** of the `Shaka Player` API that you can use to **fully control playback, tracks, streaming, events, DRM, text, and more**. This assumes you're using the **JavaScript version** of Shaka Player (v4.x).

---

## ✅ 1. **Basic Playback Controls**

```ts
player.load(manifestUri);          // Load DASH or HLS manifest
player.getMediaElement();          // Get HTMLVideoElement
player.isAudioOnly();              // Returns true if content is audio-only
player.isLive();                   // Returns true if it's a live stream
player.seekRange();                // {start, end} of seekable range
player.seek(seconds);             // Seek to time in seconds
player.pause();                    // Pause playback
player.play();                     // Start playback
player.getPlaybackRate();         // Get current playback speed
player.setPlaybackRate(rate);     // Set playback speed (e.g. 0.5, 1.5)
player.getBufferedInfo();         // Returns buffered ranges
```

---

## ✅ 2. **Track and Stream Control**

```ts
player.getVariantTracks();        // Get list of available video/audio tracks
player.getAudioLanguages();       // List of available audio languages
player.getAudioLanguagesAndRoles();
player.selectAudioLanguage('en'); // Select audio by language
player.selectVariantTrack(track); // Manually select variant track

player.getTextTracks();           // Get subtitle tracks
player.selectTextLanguage('en');  // Select subtitle language
player.selectTextTrack(track);    // Select subtitle track
player.setTextTrackVisibility(true); // Show/hide subtitles
player.isTextTrackVisible();      // Check subtitle visibility
```

---

## ✅ 3. **Adaptive Bitrate (ABR) Control**

```ts
player.configure({ abr: { enabled: false } });   // Disable ABR
player.getConfiguration().abr;                  // Get ABR config
player.configure({ abr: { defaultBandwidthEstimate: 1_000_000 } }); // Tune ABR
player.configure({ abr: { enabled: true } });    // Enable ABR
```

---

## ✅ 4. **DRM & License Handling**

```ts
player.getDrmInfo();              // Info about used DRM (e.g. Widevine)
player.configure({
  drm: {
    servers: {
      'com.widevine.alpha': 'https://example.com/license',
    },
    advanced: {
      'com.widevine.alpha': {
        videoRobustness: 'SW_SECURE_DECODE',
        audioRobustness: 'SW_SECURE_DECODE',
      },
    },
    clearKeys: {                  // For ClearKey DRM
      'key-id-in-hex': 'key-in-hex',
    },
  },
});
```

---

## ✅ 5. **Offline Downloading (with shaka.offline)**

```ts
const storage = new shaka.offline.Storage(player);
await storage.store(manifestUri);       // Download video offline
await storage.list();                   // List offline stored items
await storage.remove(contentUriOrObject);
```

---

## ✅ 6. **Event Handling**

```ts
player.addEventListener('error', (e) => { console.error(e); });
player.addEventListener('trackschanged', onTracksChanged);
player.addEventListener('adaptation', onAdaptation);
player.addEventListener('buffering', (e) => console.log(e.buffering));
player.addEventListener('loading', () => console.log('Loading...'));
player.addEventListener('loaded', () => console.log('Loaded'));
```

Full list of events: [https://shaka-player-demo.appspot.com/docs/api/shaka.Player.html#events](https://shaka-player-demo.appspot.com/docs/api/shaka.Player.html#events)

---

## ✅ 7. **Text/Subtitles Control**

```ts
player.setTextTrackVisibility(true);
player.selectTextTrack(track);       // Choose text track from getTextTracks()
player.configure({
  textDisplayFactory: () => new shaka.text.SimpleTextDisplayer(),
});
```

You can also overlay VTT/TTML manually if needed.

---

## ✅ 8. **Error Handling**

```ts
player.addEventListener('error', (event) => {
  const shakaError = event.detail;
  console.error('Shaka Error', shakaError);
  if (shakaError.code === shaka.util.Error.Code.BAD_HTTP_STATUS) {
    // Handle specific errors
  }
});
```

Full list of error codes:
[https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html#.Category](https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html#.Category)

---

## ✅ 9. **Configuration Methods**

```ts
player.configure({ preferredAudioLanguage: 'en' });
player.configure({ preferredTextLanguage: 'en' });
player.getConfiguration();     // Get current config
```

---

## ✅ 10. **Clean up and destroy**

```ts
await player.destroy();         // Clean up memory leaks
```

---

## ✅ Bonus: Streaming Stats

```ts
player.getStats();              // Get bandwidth, dropped frames, etc.
```

Example output:

```json
{
  "streamBandwidth": 1234567,
  "decodedFrames": 320,
  "droppedFrames": 3,
  "estimatedBandwidth": 5000000,
  "videoFramesDecoded": 1000,
  ...
}
```

---

## 🔧 Best Practice for Initialization

```ts
const player = new shaka.Player(videoElement);

await player.load(manifestUrl);

player.configure({
  abr: { enabled: true },
  drm: {
    clearKeys: { 'key-id': 'key' }
  }
});

player.addEventListener('error', onError);
```

---

## 💡 Pro Tips

* Always call `await player.destroy()` when changing video or unmounting.
* Prefer `player.selectVariantTrack(track, true)` to enforce non-ABR switch.
* Monitor `shaka.log.setLevel('v2')` for advanced debug logging.

---

Would you like a **fully type-safe wrapper class (TypeScript)** to control Shaka in an OOP way for your project?
