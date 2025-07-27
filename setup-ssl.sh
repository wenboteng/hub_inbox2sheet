#!/bin/bash

# OTA Answer Hub SSL Setup Script
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔒 Setting up SSL certificates for OTA Answer Hub..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your domain name"
    echo "Usage: sudo ./setup-ssl.sh your-domain.com"
    exit 1
fi

DOMAIN="$1"

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📥 Installing Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Update Nginx configuration with the actual domain
echo "🌐 Updating Nginx configuration with domain: $DOMAIN"
cat > /etc/nginx/sites-available/ota-answer-hub << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Set up automatic renewal
echo "⏰ Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Update .env file with HTTPS URL
PROJECT_DIR="/root/projects/hub_inbox2sheet"
if [ -d "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/.env" ]; then
    echo "📝 Updating .env file with HTTPS URL..."
    sed -i "s|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=\"https://$DOMAIN\"|" "$PROJECT_DIR/.env"
fi

echo "✅ SSL setup completed successfully!"
echo ""
echo "🔒 SSL Information:"
echo "• Domain: $DOMAIN"
echo "• SSL Certificate: Let's Encrypt"
echo "• Auto-renewal: Enabled (daily check at 12:00 PM)"
echo ""
echo "🌐 Your application is now accessible at:"
echo "• https://$DOMAIN"
echo "• https://www.$DOMAIN"
echo ""
echo "📋 SSL Management Commands:"
echo "• Check certificate status: certbot certificates"
echo "• Renew certificate manually: certbot renew"
echo "• View certificate details: openssl s_client -connect $DOMAIN:443 -servername $DOMAIN" 