#!/bin/bash

# Script to add app.localhost to /etc/hosts

if grep -q "app.localhost" /etc/hosts; then
    echo "✓ app.localhost already exists in /etc/hosts"
else
    echo "Adding app.localhost to /etc/hosts..."
    echo "127.0.0.1 app.localhost" | sudo tee -a /etc/hosts
    echo "✓ app.localhost added successfully"
fi

# Flush DNS cache
echo "Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
echo "✓ DNS cache flushed"

echo ""
echo "You can now access:"
echo "  - http://app.localhost:3000/overview"
echo "  - http://app.localhost:3000/sites"
echo "  - http://app.localhost:3000/settings"
echo "  - http://app.localhost:3000/builder/1"

