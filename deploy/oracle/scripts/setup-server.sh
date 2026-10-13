#!/usr/bin/env bash
# FitMe AI — one-time bootstrap for an Oracle Cloud Ubuntu 24.04 (aarch64) VM.
#
# Run as the default `ubuntu` user (has sudo):
#   curl -fsSL https://raw.githubusercontent.com/KhangNT04/fitme_ai_mvp/main/deploy/oracle/scripts/setup-server.sh | bash
# or, after copying the repo: bash deploy/oracle/scripts/setup-server.sh
#
# Does: apt upgrade, opens 80/443 in the VM firewall (Oracle images ship iptables
# rules that REJECT everything except SSH), installs Docker, clones the repo into /opt/fitme.
# The OCI Security List must ALSO allow 80/443 — see docs/DEPLOY_ORACLE_CLOUD.md section 3.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/KhangNT04/fitme_ai_mvp.git}"
APP_DIR="${APP_DIR:-/opt/fitme}"

echo "==> apt update/upgrade"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates iptables-persistent

# Must run before Docker is installed: saving afterwards would persist Docker's own chains.
echo "==> Opening 80/443 in iptables"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  fi
done
if ! sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null; then
  sudo iptables -I INPUT -p udp --dport 443 -j ACCEPT
fi
sudo netfilter-persistent save

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "==> Cloning repo into $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull origin main
fi

chmod +x "$APP_DIR"/deploy/oracle/scripts/*.sh

echo
echo "==> Done. Log out and back in (docker group), then:"
echo "    cd $APP_DIR"
echo "    cp deploy/oracle/.env.oracle.example .env.oracle && nano .env.oracle"
echo "    ./deploy/oracle/scripts/deploy-oracle.sh"
