#!/usr/bin/env bash
# CrapGPT overnight setup and verification runner
# Paste this in WSL/bash. It creates a tmux session that works through the night.

set -euo pipefail

# --------------------- VARS: EDIT THESE ---------------------
DOMAIN="crapgpt.lol"
VPS_IP="74.208.198.84"
SSH_USER="deploy"
SSH_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDJVb3ezjInN2/nr4iPim/OQlhVoCEjNfgvBIhxeARYL your_email@domain'
REPO_URL="https://github.com/JenkNZ/CrapGPT.git"
APP_DIR="/home/deploy/crapgpt"
SERVICE_NAME="crapgpt"
APP_PORT="3000"

# Optional: fill these to auto-create .env on the VPS
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="crapgpt"
R2_ENDPOINT=""    # eg https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com
OPENOPS_API_URL="https://api.openops.com"
OPENOPS_API_KEY=""
ARCADE_API_KEY=""
OPENROUTER_API_KEY=""
FAL_API_KEY=""
MODELSLAB_API_KEY=""
MCPJUNGLE_URL=""
MCPJUNGLE_CLIENT_TOKEN=""
HEXSTRIKE_CONFIG='{"serverUrl":"http://localhost:8888","transport":"mcp-http","toolWhitelist":["nmap","httpx","nuclei","subfinder","katana","gobuster"],"maxConcurrentTools":3,"timeoutSec":300,"sandbox":{"workDir":"/tmp/hexstrike","allowNet":true,"allowFS":true}}'
WORKER_API_KEY="YzEzZmViZWQtNzM3NS00MjZlLWI5MTYtMzRmNWM3ZTBhNmQyMTc1ODI4MDgwNA=="
JWT_SECRET=""
ENCRYPTION_KEY_32B=""
# ------------------------------------------------------------

# Derived
SSH_HOST_ALIAS="crapgpt-vps"
REPORT_DIR="${HOME}/crapgpt-overnight"
REPORT_FILE="${REPORT_DIR}/report-$(date +%Y%m%d-%H%M).log"
SESSION="crapgpt-overnight"

mkdir -p "$REPORT_DIR"

log() { printf "[%s] %s\n" "$(date -Is)" "$*" | tee -a "$REPORT_FILE" ; }

require_cmd() { command -v "$1" >/dev/null || { echo "Missing $1"; exit 1; }; }
for c in ssh scp dig nslookup curl tmux; do require_cmd "$c"; done

configure_ssh() {
  if ! grep -q "Host ${SSH_HOST_ALIAS}" "${HOME}/.ssh/config" 2>/dev/null; then
    cat >> "${HOME}/.ssh/config" <<EOF

Host ${SSH_HOST_ALIAS}
  HostName ${VPS_IP}
  User ${SSH_USER}
  IdentitiesOnly yes
  ServerAliveInterval 30
  ServerAliveCountMax 4
EOF
    log "Added SSH profile ${SSH_HOST_ALIAS}"
  else
    log "SSH profile ${SSH_HOST_ALIAS} already exists"
  fi
}

wait_for_dns() {
  log "Waiting for DNS A records for ${DOMAIN} and www.${DOMAIN} to point to ${VPS_IP}"
  local tries=0
  while true; do
    A1=$(dig +short A "${DOMAIN}" @1.1.1.1 | tail -n1 || true)
    A2=$(dig +short A "www.${DOMAIN}" @1.1.1.1 | tail -n1 || true)
    log "DNS check: ${DOMAIN} -> ${A1:-none}, www -> ${A2:-none}"
    if [ "$A1" = "$VPS_IP" ] && [ "${A2:-$VPS_IP}" = "$VPS_IP" ]; then
      log "DNS looks good"
      break
    fi
    tries=$((tries+1))
    if [ "$tries" -gt 120 ]; then
      log "DNS did not propagate within the window"
      break
    fi
    sleep 60
  done
}

push_bootstrap_if_missing() {
  log "Ensuring bootstrap is present and executed"
  # prepare remote bootstrap script that hardens SSH, installs Node, Wasp, Docker, Caddy, clones repo, creates .env template, creates systemd unit
  cat > /tmp/crapgpt-bootstrap.sh <<'BOOT'
#!/bin/bash
set -euo pipefail

DOMAIN="__DOMAIN__"
REPO_URL="__REPO_URL__"
APP_DIR="__APP_DIR__"
SERVICE_NAME="__SERVICE_NAME__"
APP_PORT="__APP_PORT__"
SSH_PUBKEY='__SSH_PUBKEY__'

log(){ echo "[BOOT] $*"; }

# user
if ! id deploy >/dev/null 2>&1; then
  log "Creating deploy user"
  adduser --disabled-password --gecos "CrapGPT Deploy" deploy
  usermod -aG sudo deploy
fi
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
grep -qF "$SSH_PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$SSH_PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# harden ssh
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config || true
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config || true
grep -q "^AllowUsers " /etc/ssh/sshd_config && sed -i 's/^AllowUsers .*/AllowUsers deploy/' /etc/ssh/sshd_config || echo "AllowUsers deploy" >> /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd || true

# base
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates ufw gnupg lsb-release

# swap
if ! swapon --show | grep -q swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# node and pnpm and wasp (using updated Wasp installer URL)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
corepack enable || true
corepack prepare pnpm@latest --activate || true
su - deploy -c "test -x ~/.wasp/bin/wasp || (curl -sSL https://get.wasp.sh/installer.sh | sh)"

# docker
apt-get install -y docker.io docker-compose-plugin
systemctl enable docker --now
usermod -aG docker deploy || true

# caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | tee /usr/share/keyrings/caddy-stable-archive-keyring.gpg >/dev/null
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# firewall
ufw default deny incoming || true
ufw default allow outgoing || true
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
yes | ufw enable || true

# repo
su - deploy -c "if [ ! -d '${APP_DIR}' ]; then git clone '${REPO_URL}' '${APP_DIR}'; else cd '${APP_DIR}' && git pull --ff-only || true; fi"

# env template
if [ ! -f "${APP_DIR}/.env" ]; then
  su - deploy -c "cat > '${APP_DIR}/.env' <<'ENVV'
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=crapgpt
R2_ENDPOINT=
OPENOPS_API_URL=https://api.openops.com
OPENOPS_API_KEY=
ARCADE_API_KEY=
OPENROUTER_API_KEY=
FAL_API_KEY=
MODELSLAB_API_KEY=
MCPJUNGLE_URL=
MCPJUNGLE_CLIENT_TOKEN=
HEXSTRIKE_CONFIG={\"serverUrl\":\"http://localhost:8888\",\"transport\":\"mcp-http\",\"toolWhitelist\":[\"nmap\",\"httpx\",\"nuclei\",\"subfinder\",\"katana\",\"gobuster\"],\"maxConcurrentTools\":3,\"timeoutSec\":300,\"sandbox\":{\"workDir\":\"/tmp/hexstrike\",\"allowNet\":true,\"allowFS\":true}}
WORKER_API_KEY=
JWT_SECRET=
ENCRYPTION_KEY_32B=
ENVV"
  chmod 600 "${APP_DIR}/.env"
  chown deploy:deploy "${APP_DIR}/.env"
fi

# caddyfile
if [ -n "$DOMAIN" ]; then
  cat >/etc/caddy/Caddyfile <<CADDY
$DOMAIN {
  reverse_proxy 127.0.0.1:$APP_PORT
  encode zstd gzip
}
www.$DOMAIN {
  redir https://$DOMAIN{uri}
}
CADDY
else
  cat >/etc/caddy/Caddyfile <<'CADDY'
:80 {
  respond "CrapGPT is up. Add domain for TLS." 200
}
CADDY
fi
systemctl restart caddy

# service
cat >/etc/systemd/system/$SERVICE_NAME.service <<SERVICE
[Unit]
Description=CrapGPT Wasp app
After=network-online.target
Wants=network-online.target

[Service]
User=deploy
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/home/deploy/.wasp/bin/wasp start
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable $SERVICE_NAME || true

echo "[BOOT] Bootstrap complete"
BOOT

  sed -i "s|__DOMAIN__|${DOMAIN}|g" /tmp/crapgpt-bootstrap.sh
  sed -i "s|__REPO_URL__|${REPO_URL}|g" /tmp/crapgpt-bootstrap.sh
  sed -i "s|__APP_DIR__|${APP_DIR}|g" /tmp/crapgpt-bootstrap.sh
  sed -i "s|__SERVICE_NAME__|${SERVICE_NAME}|g" /tmp/crapgpt-bootstrap.sh
  sed -i "s|__APP_PORT__|${APP_PORT}|g" /tmp/crapgpt-bootstrap.sh
  sed -i "s|__SSH_PUBKEY__|${SSH_PUBKEY}|g" /tmp/crapgpt-bootstrap.sh

  scp -o StrictHostKeyChecking=no /tmp/crapgpt-bootstrap.sh ${SSH_HOST_ALIAS}:/tmp/
  ssh -o StrictHostKeyChecking=no ${SSH_HOST_ALIAS} "sudo bash /tmp/crapgpt-bootstrap.sh"
}

maybe_push_env() {
  if [ -n "$SUPABASE_URL" ]; then
    log "Uploading filled .env to VPS"
    TMPENV=$(mktemp)
    cat > "$TMPENV" <<ENVV
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET=${R2_BUCKET}
R2_ENDPOINT=${R2_ENDPOINT}
OPENOPS_API_URL=${OPENOPS_API_URL}
OPENOPS_API_KEY=${OPENOPS_API_KEY}
ARCADE_API_KEY=${ARCADE_API_KEY}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
FAL_API_KEY=${FAL_API_KEY}
MODELSLAB_API_KEY=${MODELSLAB_API_KEY}
MCPJUNGLE_URL=${MCPJUNGLE_URL}
MCPJUNGLE_CLIENT_TOKEN=${MCPJUNGLE_CLIENT_TOKEN}
HEXSTRIKE_CONFIG=${HEXSTRIKE_CONFIG}
WORKER_API_KEY=${WORKER_API_KEY}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY_32B=${ENCRYPTION_KEY_32B}
ENVV
    scp "$TMPENV" ${SSH_HOST_ALIAS}:/tmp/.env.crapgpt
    ssh ${SSH_HOST_ALIAS} "sudo mv /tmp/.env.crapgpt ${APP_DIR}/.env && sudo chown ${SSH_USER}:${SSH_USER} ${APP_DIR}/.env && sudo chmod 600 ${APP_DIR}/.env"
    rm -f "$TMPENV"
  else
    log "Skipping .env upload because SUPABASE_URL is empty. You can fill it manually later."
  fi
}

start_and_wait_tls() {
  log "Starting service and waiting for TLS"
  ssh ${SSH_HOST_ALIAS} "sudo systemctl restart caddy; sudo systemctl start ${SERVICE_NAME}; sudo systemctl status ${SERVICE_NAME} --no-pager -l || true"

  # wait for HTTPS to come up
  local tries=0
  while true; do
    if [ -n "$DOMAIN" ]; then
      CODE=$(curl -ks -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" || true)
      log "HTTPS probe returned ${CODE}"
      if [[ "$CODE" =~ ^2|3 ]]; then
        log "TLS and app are up"
        break
      fi
    else
      CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${VPS_IP}/" || true)
      log "HTTP probe returned ${CODE}"
      if [[ "$CODE" =~ ^2|3 ]]; then
        log "App reachable over HTTP"
        break
      fi
    fi
    tries=$((tries+1))
    if [ "$tries" -gt 60 ]; then
      log "Service did not become healthy within the window"
      break
    fi
    sleep 60
  done
}

write_health_report() {
  log "Writing extra health information"
  {
    echo
    echo "# Host summary"
    ssh ${SSH_HOST_ALIAS} "uname -a; lsb_release -a 2>/dev/null || true; free -h; df -h /; sudo systemctl is-active ${SERVICE_NAME}; sudo systemctl is-active caddy"
    echo
    echo "# Open ports"
    ssh ${SSH_HOST_ALIAS} "sudo ss -ltnp | head -n 30"
    echo
    echo "# Caddy logs last 100 lines"
    ssh ${SSH_HOST_ALIAS} "sudo journalctl -u caddy -n 100 --no-pager"
    echo
    echo "# App logs last 200 lines"
    ssh ${SSH_HOST_ALIAS} "sudo journalctl -u ${SERVICE_NAME} -n 200 --no-pager"
  } >> "$REPORT_FILE" || true

  if [ -n "$DOMAIN" ]; then
    echo >> "$REPORT_FILE"
    echo "# curl -I https://${DOMAIN}" >> "$REPORT_FILE"
    curl -skI "https://${DOMAIN}" >> "$REPORT_FILE" || true
  fi

  log "Report written to ${REPORT_FILE}"
}

spawn_tmux() {
  tmux new-session -d -s "${SESSION}" "bash -lc '
set -euo pipefail
echo \"[tmux] Starting overnight checks at \$(date -Is)\"
sleep 5
'"
  tmux send-keys -t "${SESSION}" "bash -lc '$(declare -f log); log \"Overnight session active\"'" C-m
}

# Run
configure_ssh
spawn_tmux
wait_for_dns
push_bootstrap_if_missing
maybe_push_env
start_and_wait_tls
write_health_report

log "All done. You can tail the report: tail -f ${REPORT_FILE}"
echo
echo "Open this in your browser once green: https://${DOMAIN}"