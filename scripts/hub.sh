#!/bin/zsh
# Runs the TokaiHub bridge on this Mac as background services (launchd) for one owner.
#
#   bridge  127.0.0.1:8791  local: the app on this Mac, Microsoft sign-in window, setup codes
#           127.0.0.1:8792  public: data API for the hosted app, owner's passkey token required
#   tunnel  cloudflared forwards https://$HUB_API_HOST to 127.0.0.1:8792 (no open router ports)
#
# Settings live in ~/.tokaihub/hub.env, outside the repo:
#   HUB_OWNER_ID=<student ID>                          the only TIPS account the Hub accepts
#   HUB_APP_ORIGIN=https://tokaihub.mohamedfuad.com    hosted app (passkeys are bound to it)
#   HUB_API_HOST=tokaihub-api.mohamedfuad.com          tunnel host name
#
#   scripts/hub.sh start          build, start the bridge (+ tunnel once set up)
#   scripts/hub.sh stop           stop both services
#   scripts/hub.sh status         services, TIPS session, owner, passkeys
#   scripts/hub.sh logs           follow the logs
#   scripts/hub.sh tunnel-setup   once, after `cloudflared tunnel login`: create tunnel + DNS
#   scripts/hub.sh devices-reset  remove every passkey and device token
set -euo pipefail

ROOT=${0:A:h:h}
ENV_FILE=~/.tokaihub/hub.env
[ -f $ENV_FILE ] && source $ENV_FILE
: ${HUB_OWNER_ID:?set HUB_OWNER_ID in $ENV_FILE}
: ${HUB_APP_ORIGIN:?set HUB_APP_ORIGIN in $ENV_FILE}
: ${HUB_API_HOST:?set HUB_API_HOST in $ENV_FILE}

LABEL=com.mohamedfuad.tokaihub
TUNNEL_LABEL=$LABEL.tunnel
LOG_DIR=~/Library/Logs/TokaiHub
PORT=8791
PUBLIC_PORT=8792
DOMAIN=gui/$(id -u)
CF=/opt/homebrew/bin/cloudflared
CF_CONFIG=~/.cloudflared/tokaihub.yml
plist() { echo ~/Library/LaunchAgents/$1.plist; }

write_bridge_plist() {
  cat > $(plist $LABEL) <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <!-- caffeinate keeps the Mac from idle-sleeping only while the service runs. -->
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string><string>-is</string>
    <string>$ROOT/node_modules/.bin/tsx</string><string>server/index.ts</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>TIPS_BRIDGE_PORT</key><string>$PORT</string>
    <key>TIPS_PUBLIC_PORT</key><string>$PUBLIC_PORT</string>
    <key>TIPS_PERSIST</key><string>1</string>
    <key>TIPS_HUB_SESSION_MINUTES</key><string>0</string>
    <key>HUB_OWNER_ID</key><string>$HUB_OWNER_ID</string>
    <key>HUB_APP_ORIGIN</key><string>$HUB_APP_ORIGIN</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/hub.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/hub.log</string>
</dict>
</plist>
PLIST
}

write_tunnel_plist() {
  cat > $(plist $TUNNEL_LABEL) <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$TUNNEL_LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$CF</string><string>tunnel</string><string>--config</string><string>$CF_CONFIG</string><string>run</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/tunnel.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/tunnel.log</string>
</dict>
</plist>
PLIST
}

# bootout returns before the old job is gone; bootstrap fails with an I/O error until it is.
unload() {
  launchctl bootout $DOMAIN/$1 2>/dev/null || return 1
  for _ in {1..20}; do launchctl print $DOMAIN/$1 >/dev/null 2>&1 || return 0; sleep 0.5; done
}
load() { unload $1 || true; launchctl bootstrap $DOMAIN $(plist $1); }

case ${1:-status} in
  start)
    mkdir -p $LOG_DIR ~/Library/LaunchAgents
    (cd $ROOT && npm run build --silent)
    write_bridge_plist && load $LABEL
    echo "bridge started: http://127.0.0.1:$PORT (log: $LOG_DIR/hub.log)"
    if [ -f $CF_CONFIG ]; then
      write_tunnel_plist && load $TUNNEL_LABEL
      echo "tunnel started: https://$HUB_API_HOST (log: $LOG_DIR/tunnel.log)"
    else
      echo "tunnel not set up yet: run 'cloudflared tunnel login', then 'scripts/hub.sh tunnel-setup'"
    fi
    ;;
  stop)
    for l in $TUNNEL_LABEL $LABEL; do unload $l && echo "stopped $l" || echo "$l was not running"; done
    ;;
  status)
    for l in $LABEL $TUNNEL_LABEL; do
      printf '%s: ' $l; { launchctl print $DOMAIN/$l 2>/dev/null || true; } | awk '/^\tstate =/ {print $3; f=1} END {if (!f) print "not running"}'
    done
    curl -s --max-time 3 http://127.0.0.1:$PORT/tips-api/status && echo || echo "bridge: not answering on $PORT"
    curl -s --max-time 5 -o /dev/null -w "public https://$HUB_API_HOST/tips-api/health -> %{http_code}\n" https://$HUB_API_HOST/tips-api/health || true
    ;;
  logs)
    tail -f $LOG_DIR/hub.log $LOG_DIR/tunnel.log
    ;;
  tunnel-setup)
    [ -f ~/.cloudflared/cert.pem ] || { echo "run 'cloudflared tunnel login' first (opens Cloudflare in your browser)"; exit 1; }
    $CF tunnel list | grep -q ' tokaihub ' || $CF tunnel create tokaihub
    ID=$($CF tunnel list | awk '$2 == "tokaihub" {print $1}')
    cat > $CF_CONFIG <<YML
tunnel: $ID
credentials-file: $HOME/.cloudflared/$ID.json
ingress:
  - hostname: $HUB_API_HOST
    service: http://127.0.0.1:$PUBLIC_PORT
  - service: http_status:404
YML
    $CF tunnel route dns tokaihub $HUB_API_HOST
    echo "tunnel ready; run 'scripts/hub.sh start'"
    ;;
  devices-reset)
    # The bridge keeps the device list in memory, so stop it around the reset.
    unload $LABEL || true
    HUB_OWNER_ID=$HUB_OWNER_ID HUB_APP_ORIGIN=$HUB_APP_ORIGIN $ROOT/node_modules/.bin/tsx -e "import('$ROOT/server/auth.ts').then(a => { a.resetDevices(); console.log('all passkeys and device tokens removed'); })"
    [ -f $(plist $LABEL) ] && launchctl bootstrap $DOMAIN $(plist $LABEL) && echo "bridge restarted"
    ;;
  *)
    echo "usage: scripts/hub.sh start|stop|status|logs|tunnel-setup|devices-reset" >&2; exit 2
    ;;
esac
