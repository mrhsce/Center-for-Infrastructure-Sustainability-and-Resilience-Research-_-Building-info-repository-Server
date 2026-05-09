#!/bin/bash
# Quick setup script for Building Survey Server
# This script helps you set up secrets and configuration for local development

set -e  # Exit on error

echo "🔐 Building Survey Server - Configuration Setup"
echo "================================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env setup"
        exit 0
    fi
fi

# Copy .env.example to .env
echo "📋 Creating .env from .env.example..."
cp .env.example .env
echo "✅ Created .env"
echo ""

# Check for RSA keys
echo "🔑 Checking for RSA keys..."
if [ ! -f utils/private.key ] || [ ! -f utils/public.key ]; then
    echo "⚠️  RSA keys not found!"
    read -p "Generate new RSA keys? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Generating RSA key pair..."
        openssl genrsa -out utils/private.key 1024
        openssl rsa -in utils/private.key -pubout -out utils/public.key
        echo "✅ RSA keys generated"
        echo "   - utils/private.key"
        echo "   - utils/public.key"
    fi
else
    echo "✅ RSA keys found"
fi
echo ""

# Verify .gitignore
echo "🚫 Verifying .gitignore..."
if grep -q "\.env" .gitignore && grep -q "utils/private.key" .gitignore; then
    echo "✅ .gitignore is properly configured"
else
    echo "⚠️  .gitignore may be missing secret entries"
fi
echo ""

# Check package.json for dotenv
echo "📦 Checking dependencies..."
if grep -q "\"dotenv\"" package.json; then
    echo "✅ dotenv is in package.json"
else
    echo "⚠️  dotenv is missing from package.json"
    read -p "Run 'npm install' to install dependencies? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install
        echo "✅ Dependencies installed"
    fi
fi
echo ""

echo "========================================="
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env and fill in your credentials:"
echo "   - Database (DB_USER, DB_PASSWORD, DB_SERVER, DB_NAME)"
echo "   - Firebase FCM key (FCM_AUTHORIZATION_KEY)"
echo "   - Payment gateway credentials (optional)"
echo ""
echo "2. Edit config/default.json and replace PLACEHOLDER_* values"
echo "   (or create config/production.json for production)"
echo ""
echo "3. Run the server:"
echo "   npm run start-dev"
echo ""
echo "📚 For more details, see:"
echo "   - README.md (Secrets and Configuration Management section)"
echo "   - SECURITY.md (Security information)"
echo "   - .env.example (Environment variables)"
echo ""

