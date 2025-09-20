#!/bin/bash

# SSH Key Fix Script
echo "Setting up SSH key access for deploy user..."

# Ensure deploy user exists and has proper shell
sudo usermod -s /bin/bash deploy 2>/dev/null || echo "Deploy user already configured"

# Create .ssh directory with correct permissions
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Add the correct public key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDJVb3ezjInN2/nr4iPim/OQlhVoCEjNfgvBIhxeARYL your_email@domain" | sudo tee /home/deploy/.ssh/authorized_keys > /dev/null

# Set correct ownership and permissions
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Verify setup
echo "Checking setup..."
ls -la /home/deploy/.ssh/
echo "Key fingerprint should match: SHA256:Kjs+nIAjozIuEzjVBuUyPV4SRtkaTsdSxMHfcUwu4fc"
ssh-keygen -lf /home/deploy/.ssh/authorized_keys

echo "SSH key setup complete. Try connecting now."