#!/bin/bash
# Ultra-minimal bootstrap for VPS console (minimal typing required)
# Type this in VPS console: curl -s https://raw.githubusercontent.com/JenkNZ/CrapGPT/master/bootstrap-minimal.sh | bash

set -euo pipefail

# Create deploy user if doesn't exist
if ! id deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "Deploy User" deploy
  usermod -aG sudo deploy
  echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
fi

# Set up SSH key for deploy user
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDJVb3ezjInN2/nr4iPim/OQlhVoCEjNfgvBIhxeARYL deploy@crapgpt" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Harden SSH
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
echo "AllowUsers deploy" >> /etc/ssh/sshd_config
systemctl restart sshd

# Basic packages
apt-get update -y
apt-get install -y curl git ufw

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp  
ufw allow 443/tcp
yes | ufw enable

# Download full deployment script
su - deploy -c "curl -s https://raw.githubusercontent.com/JenkNZ/CrapGPT/master/deploy-overnight.sh -o ~/deploy-full.sh && chmod +x ~/deploy-full.sh"

echo "Bootstrap complete. SSH in as deploy user and run ~/deploy-full.sh"
echo "SSH command: ssh deploy@$(curl -s ifconfig.me)"