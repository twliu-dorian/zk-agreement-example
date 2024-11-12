#!/bin/bash

echo "Cleaning up existing installations..."

# Clean root directory
cd /opt/Capstone
rm -rf node_modules package-lock.json

# Save root package.json content
cat > package.json << 'EOL'
{
  "name": "ransomware-recovery-service",
  "version": "1.0.0",
  "description": "Ransomware Recovery Service CLI Tool",
  "main": "recovery-cli.js",
  "dependencies": {
    "@accordproject/cicero-core": "0.22.0",
    "@accordproject/cicero-engine": "0.22.0",
    "@accordproject/cicero-test": "0.22.0",
    "@accordproject/ergo-compiler": "0.22.0",
    "@accordproject/ergo-engine": "0.22.0",
    "@accordproject/cicero-cli": "0.22.0",
    "commander": "8.3.0"
  },
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "clean": "rm -rf node_modules package-lock.json"
  },
  "author": "",
  "license": "ISC"
}
EOL

# Clean template directory and save template package.json
mkdir -p templates/ransomware-template
cd templates/ransomware-template
rm -rf node_modules package-lock.json

cat > package.json << 'EOL'
{
    "name": "ransomware-recovery-template",
    "displayName": "Ransomware Recovery Agreement",
    "version": "0.1.0",
    "description": "A template for ransomware recovery agreements using the Accord Project.",
    "author": "Accord Project",
    "license": "Apache-2.0",
    "accordproject": {
        "template": "contract",
        "cicero": "0.22.0"
    },
    "devDependencies": {
        "cucumber": "5.1.0"
    },
    "dependencies": {
        "@accordproject/cicero-core": "0.22.0",
        "@accordproject/cicero-engine": "0.22.0",
        "@accordproject/ergo-compiler": "0.22.0"
    },
    "scripts": {
        "test": "cucumber-js test -r .cucumber.js"
    }
}
EOL

cd ../..

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove global installations if any
echo "Removing any global installations..."
npm uninstall -g @accordproject/cicero-cli @accordproject/cicero-core

# Install dependencies with exact versions
echo "Installing dependencies..."
npm install

echo "Verifying installations..."
npm list @accordproject/cicero-core
npm list @accordproject/cicero-engine
npm list @accordproject/ergo-compiler

echo "Done! Please check the versions above."
