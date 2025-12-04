$certDir = "frontend\certs"
if (!(Test-Path -Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

$certPath = "$certDir\localhost.crt"
$keyPath = "$certDir\localhost.key"

# Check if openssl is available
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
      -keyout $keyPath `
      -out $certPath `
      -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
    Write-Host "Certificates generated in $certDir"
} else {
    Write-Error "OpenSSL not found. Please install OpenSSL or use Git Bash to run generate-certs.sh"
}

