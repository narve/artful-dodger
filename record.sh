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
