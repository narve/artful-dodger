#!/bin/bash

cleanup() {
  echo "[theatre] restoring display settings"
  [ -n "$XSET_SCREEN" ] && xset s on s blank
  [ -n "$XSET_DPMS"   ] && xset +dpms
}
trap cleanup EXIT

if [ -n "$DISPLAY" ] && command -v xset &>/dev/null; then
  xset s off s noblank && XSET_SCREEN=1
  if xset q 2>/dev/null | grep -q 'DPMS is Enabled\|DPMS is Disabled'; then
    xset -dpms && XSET_DPMS=1
  fi
  echo "[theatre] screensaver off${XSET_DPMS:+, DPMS off}"
else
  echo "[theatre] no X11 display found, skipping xset (systemd-inhibit still active)"
fi

echo "[theatre] acquiring idle/sleep inhibitor"
systemd-inhibit \
  --what=idle:sleep:handle-lid-switch \
  --who="Art Display" \
  --why="Theatre mode" \
  npm run watch
