# Webcam Capture

`webcam.js` captures a JPEG from a v4l2 camera at a fixed interval and saves it to the image folder,
where the server picks it up for LLM description.

## Configuration

| Variable             | Default           | Description                                  |
| -------------------- | ----------------- | -------------------------------------------- |
| `WEBCAM_INTERVAL_MS` | `10000`           | Capture interval in milliseconds             |
| `SRC`                | `./images`        | Output folder                                |
| `WEBCAM_DEVICE`      | auto (`/dev/video0`) | Camera device path                        |
| `WEBCAM_PREFIX`      | `stage`           | Filename prefix                              |
| `WEBCAM_ENABLE`      | *(unset)*         | Set to `1` to auto-start from the server     |

Filenames are saved as `<PREFIX>_YYYY-MM-DD_HH-MM-SS.jpg` (UTC timestamp).

## Running

**Standalone:**
```bash
npm run web-cam
```

**With the server** (auto-spawned as a child process):
```bash
WEBCAM_ENABLE=1 npm start
# or
WEBCAM_ENABLE=1 npm run watch
```

`npm run watch` sets `WEBCAM_ENABLE=1` by default.

## Requirements

- `ffmpeg` must be installed and on `PATH`
- A v4l2-compatible camera (e.g. `/dev/video0`)
