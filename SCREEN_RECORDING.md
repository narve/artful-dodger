# Screen Recording

Record the full screen to a video file. `record.sh` auto-detects the display server and
available tools. `ffmpeg -f x11grab` does **not** work on Wayland — it only captures
XWayland and produces a black screen.

## Tools

| Setup                  | Tool                  | Install                          |
| ---------------------- | --------------------- | -------------------------------- |
| KDE / GNOME Wayland    | `gpu-screen-recorder` | `yay -S gpu-screen-recorder`     |
| wlroots Wayland        | `wf-recorder`         | `sudo pacman -S wf-recorder`     |
| X11                    | `ffmpeg`              | `sudo pacman -S ffmpeg`          |

`gpu-screen-recorder` works on any compositor and is the safest default on Arch.

## record.sh

Waits 5 seconds (time to get into position), then records for 20 seconds. Picks the right
tool automatically.

```bash
./record.sh                          # saves recording_YYYY-MM-DD_HH-MM-SS.mp4
./record.sh my-clip.mp4              # custom filename
```

Full script:

```bash
#!/bin/bash
# Usage: ./record.sh [output.mp4]
# Waits 5 seconds, then records the full screen for 20 seconds.
#
# Requirements (pick one matching your setup):
#   KDE/GNOME Wayland : yay -S gpu-screen-recorder
#   wlroots Wayland   : sudo pacman -S wf-recorder
#   X11               : sudo pacman -S ffmpeg

OUTPUT="${1:-recording_$(date +%Y-%m-%d_%H-%M-%S).mp4}"
WAIT=5
DURATION=20

echo "[record] output:   $OUTPUT"
echo "[record] starting in ${WAIT}s..."
sleep "$WAIT"
echo "[record] recording for ${DURATION}s..."

if command -v gpu-screen-recorder &>/dev/null; then
  gpu-screen-recorder -w screen -f 30 -c mp4 -o "$OUTPUT" &
  GSR_PID=$!
  sleep "$DURATION"
  kill -SIGINT "$GSR_PID"
  wait "$GSR_PID"
elif [ -n "$WAYLAND_DISPLAY" ] && command -v wf-recorder &>/dev/null; then
  wf-recorder --duration "$DURATION" -f "$OUTPUT"
elif [ -n "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ] && command -v ffmpeg &>/dev/null; then
  RES=$(xdpyinfo 2>/dev/null | awk '/dimensions/{print $2}')
  ffmpeg -f x11grab -video_size "${RES:-1920x1080}" -i "${DISPLAY:-:0.0}" \
    -t "$DURATION" -vcodec libx264 -preset fast -y "$OUTPUT"
else
  echo "[record] error: no suitable recorder found." >&2
  echo "[record] on KDE/GNOME Wayland: yay -S gpu-screen-recorder" >&2
  echo "[record] on wlroots Wayland:   sudo pacman -S wf-recorder" >&2
  echo "[record] on X11:               sudo pacman -S ffmpeg" >&2
  exit 1
fi

echo "[record] saved $OUTPUT"
```

## Screen-record mode (5 s capture interval)

```bash
npm run screen-record
```

Starts the server with `WEBCAM_INTERVAL_MS=5000` so the webcam captures every 5 seconds.
The server advertises `secondsToNextCapture: 5` in the API response and the frontend
automatically adjusts its poll interval and countdown to match.

## Manual commands

**gpu-screen-recorder (Wayland, recommended):**
```bash
gpu-screen-recorder -w screen -f 30 -c mp4 -o output.mp4
# Ctrl+C to stop
```

**wf-recorder (wlroots Wayland):**
```bash
wf-recorder -f output.mp4           # Ctrl+C to stop
wf-recorder --duration 20 -f output.mp4
```

**ffmpeg (X11 only):**
```bash
ffmpeg -f x11grab -video_size 1920x1080 -i :0.0 -vcodec libx264 output.mp4
```
