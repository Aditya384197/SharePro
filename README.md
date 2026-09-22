# SharePro — Real P2P File Transfer

SharePro is a mobile-first file sharing app built for real transfers, not a visual demo. File bytes are transferred directly over a WebRTC `RTCDataChannel`. Signaling carries only connection metadata and SDP/ICE information; it never relays the file payload.

## Android-to-Android transfer

1. Install SharePro on both phones.
2. Put both phones on the same Wi-Fi / local network.
3. On the receiving phone tap **Receive**. SharePro starts a small local pairing service and shows a QR code + 6-digit room code.
4. On the sending phone tap **Send**, choose files, then **Scan receiver QR** or enter the room code.
5. The receiver sees the sender and the requested files. Tap **Accept**.
6. The connection is negotiated locally and the file bytes then move directly through WebRTC with binary chunks and backpressure.

No external signaling server is required for the Android-to-Android LAN flow.

## Web / desktop mode

The browser version uses the included Node/Express + WebSocket signaling server. It still transfers the actual files directly through WebRTC after signaling completes.

```bash
npm install
npm start
```

Open `http://localhost:3000` on the participating browsers. For frontend-only development with Vite, use `npm run dev:web`; actual WebSocket signaling is provided by `npm start`.

## Android build

The repository contains the native Android project, a small Capacitor bridge plugin for local LAN pairing, and a GitHub Actions workflow.

### GitHub Actions

Push the repository and run **Build SharePro Android APK** from Actions. The workflow builds the web UI, copies it into the Android assets, and assembles a debug APK.

### Android Studio / command line

```bash
npm install
npm run android:sync
```

Then open the `android/` folder in Android Studio. For command-line assembly with Gradle 8.13:

```bash
gradle -p android :app:assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Important implementation notes

- **No demo file data** is bundled into the application.
- **No Base64 file relay** is used for transfers.
- The receiver stores incoming data in Origin Private File System (OPFS) when the browser exposes it; otherwise it falls back to chunked in-memory assembly for compatibility.
- Every file is checked against the announced byte size before completion is acknowledged.
- The sender waits for a per-file ready message and a per-file completion acknowledgement before moving to the next file.
- Data-channel buffering is capped with explicit backpressure to avoid unbounded RAM growth.
- QR scanning uses a real camera decoder rather than opening the camera without decoding.

## Project structure

- `src/utils/webrtc.ts` — P2P connection, signaling state machine, binary transfer protocol, backpressure and acknowledgements.
- `src/utils/native.ts` — Capacitor bridge for Android LAN pairing.
- `android/app/src/main/java/com/sharepro/app/LocalSignalingPlugin.java` — local HTTP/UDP signaling and discovery service used by the Android receiver.
- `src/components/*` — mobile-first UI, QR flow, transfer screen and history.
- `.github/workflows/build-apk.yml` — reproducible GitHub Actions APK build.
