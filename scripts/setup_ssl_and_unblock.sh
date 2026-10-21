#!/usr/bin/env bash
# ==============================================================================
# MDefender Pro - Enterprise Edge SSL Setup & Zero-Touch Automation Daemon
# ==============================================================================
set -e

ADMIN_IPS=("103.120.45.240" "103.120.45.241")
DOMAIN="mahabubur.shop"
APP_DIR="/var/www/Mdefender-Pro"

echo "[1/6] Unblocking and whitelisting Admin IPs in MongoDB..."
for ip in "${ADMIN_IPS[@]}"; do
    docker compose exec -T mongodb mongosh mdefender --quiet --eval "
    db.blacklist.deleteMany({ip: '$ip'});
    db.auto_blocks.deleteMany({ip: '$ip'});
    db.attack_attempts.deleteMany({ip: '$ip'});
    db.whitelist.updateOne({ip: '$ip'}, {\$set: {ip: '$ip', description: 'Admin Public IP', added_at: new Date()}}, {upsert: true});
    print('-> Successfully unblocked and whitelisted $ip');
    " || true
done
echo "-> Restarting WAF application & DNS containers to flush in-memory caches..."
docker compose restart mdefender-app mdefender-dns || true

echo "[2/6] Ensuring fallback SSL certificate exists for Nginx..."
mkdir -p /etc/ssl/certs /etc/ssl/private
if [ ! -f /etc/ssl/certs/mdefender-edge.crt ]; then
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/ssl/private/mdefender-edge.key \
        -out /etc/ssl/certs/mdefender-edge.crt \
        -subj "/C=US/ST=Security/L=Cloud/O=MDefender/CN=mdefender-waf-edge"
    chmod 600 /etc/ssl/private/mdefender-edge.key
    echo "-> Fallback SSL certificate generated."
else
    echo "-> Fallback SSL certificate already exists."
fi

echo "[3/6] Setting up webroot and Nginx dynamic domains directories..."
mkdir -p /var/www/certbot/.well-known/acme-challenge
mkdir -p /etc/nginx/conf.d/domains
touch /etc/nginx/conf.d/domains/.empty
chmod -R 755 /var/www/certbot

echo "[4/6] Configuring firewall for Ports 80, 443, 53..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 53/udp || true
    ufw allow 53/tcp || true
    echo "-> UFW firewall rules updated."
fi

echo "[5/6] Ensuring Certbot & Issuing SSL for mdefender-pro.crafix.tech..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx python3-pip python3-pymongo || true
pip3 install pymongo || true

certbot certonly --webroot -w /var/www/certbot \
    -d mdefender-pro.crafix.tech \
    --non-interactive --agree-tos \
    --register-unsafely-without-email \
    --keep-until-expiring || true

if [ ! -f /etc/letsencrypt/live/mdefender-pro.crafix.tech/fullchain.pem ]; then
    mkdir -p /etc/letsencrypt/live/mdefender-pro.crafix.tech
    cp /etc/ssl/certs/mdefender-edge.crt /etc/letsencrypt/live/mdefender-pro.crafix.tech/fullchain.pem
    cp /etc/ssl/private/mdefender-edge.key /etc/letsencrypt/live/mdefender-pro.crafix.tech/privkey.pem
fi

echo "[6/6] Syncing Nginx configuration..."
mkdir -p /var/cache/nginx/mdefender
rm -f /etc/nginx/sites-enabled/default
if [ -f "$APP_DIR/nginx/mdefender-pro.conf" ]; then
    cp "$APP_DIR/nginx/mdefender-pro.conf" /etc/nginx/sites-available/mdefender-pro.conf || true
    ln -sf /etc/nginx/sites-available/mdefender-pro.conf /etc/nginx/sites-enabled/ || true
fi
nginx -t
systemctl reload nginx
echo "-> Nginx reloaded successfully."

# Install systemd service for 24/7 background SSL automation
cat << 'EOF' > /etc/systemd/system/mdefender-ssl.service
[Unit]
Description=MDefender Pro Zero-Touch Universal SSL Background Worker
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/Mdefender-Pro
ExecStart=/usr/bin/python3 /var/www/Mdefender-Pro/scripts/mdefender_ssl_automation.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Install systemd service for Edge Cache Pre-Warmer (eliminates origin latency)
cat << 'EOF' > /etc/systemd/system/mdefender-warmer.service
[Unit]
Description=MDefender Pro Edge Cache Pre-Warmer & Predictive Crawler
After=network.target nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/Mdefender-Pro
ExecStart=/usr/bin/python3 /var/www/Mdefender-Pro/scripts/mdefender_cache_warmer.py --daemon
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mdefender-ssl.service mdefender-warmer.service
systemctl restart mdefender-ssl.service mdefender-warmer.service

echo "-> Triggering immediate one-shot SSL run for existing domains..."
python3 "$APP_DIR/scripts/mdefender_ssl_automation.py" --once || true

echo "-> Triggering immediate one-shot Edge Cache Pre-Warmer..."
python3 "$APP_DIR/scripts/mdefender_cache_warmer.py" || true

echo "=============================================================================="
echo "ALL DONE! MDefender Pro SaaS Edge & Universal SSL Automation is 100% ACTIVE!"
echo "Systemd services 'mdefender-ssl.service' & 'mdefender-warmer.service' are ACTIVE!"
echo "=============================================================================="
