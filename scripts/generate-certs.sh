#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p frontend/certs

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout frontend/certs/localhost.key \
  -out frontend/certs/localhost.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

echo "Certificates generated in frontend/certs/"

