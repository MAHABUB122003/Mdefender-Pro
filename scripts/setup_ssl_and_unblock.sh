#!/usr/bin/env bash
# ==============================================================================
# MDefender Pro - Edge SSL Setup & Admin IP Unblock Script
# ==============================================================================
set -e

ADMIN_IPS=("103.120.45.240" "103.120.45.241")
DOMAIN="mahabubur.shop"

echo "[1/5] Unblocking and whitelisting Admin IPs in MongoDB..."
for ip in "${ADMIN_IPS[@]}"; do
    docker compose exec -T mongodb mongosh mdefender --quiet --eval "
    db.blacklist.deleteMany({ip: '$ip'});
    db.auto_blocks.deleteMany({ip: '$ip'});
    db.attack_attempts.deleteMany({ip: '$ip'});
    db.whitelist.updateOne({ip: '$ip'}, {\$set: {ip: '$ip', description: 'Admin Public IP', added_at: new Date()}}, {upsert: true});
    print('-> Successfully unblocked and whitelisted $ip');
    " || true
done

echo "[2/5] Ensuring fallback SSL certificate exists for Nginx..."
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

echo "[3/5] Configuring firewall for Port 443 (HTTPS) & Port 80..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 53/udp || true
    ufw allow 53/tcp || true
    echo "-> UFW firewall rules updated."
fi

echo "[4/5] Testing Nginx configuration & reloading..."
nginx -t
systemctl reload nginx
echo "-> Nginx reloaded successfully on ports 80 and 443."

echo "[5/5] Checking Certbot for trusted Let's Encrypt SSL on $DOMAIN..."
if ! command -v certbot &> /dev/null; then
    echo "-> Installing certbot python3-certbot-nginx..."
    apt-get update -y && apt-get install -y certbot python3-certbot-nginx
fi

echo "-> Requesting / renewing trusted Let's Encrypt SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
    echo "Notice: Certbot automatic issuance encountered a notice, fallback self-signed SSL is active."
}

systemctl reload nginx
echo "=============================================================================="
echo "ALL DONE! $DOMAIN is fully active with MDefender Cloud WAF & SSL protection!"
echo "=============================================================================="
