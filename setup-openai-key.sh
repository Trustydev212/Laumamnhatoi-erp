#!/bin/bash

# Script to setup OpenAI API Key on VPS
# Usage: ./setup-openai-key.sh [your-api-key]

set -e

BACKEND_DIR="apps/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo "🔧 Setting up OpenAI API Key on VPS..."
echo ""

# Get API key from argument or prompt
if [ -z "$1" ]; then
    echo "⚠️  No API key provided as argument."
    echo "Please provide your OpenAI API key:"
    echo ""
    read -p "Enter your OPENAI_API_KEY (sk-...): " API_KEY
else
    API_KEY="$1"
fi

# Validate API key format
if [ -z "$API_KEY" ]; then
    echo "❌ Error: API key cannot be empty!"
    exit 1
fi

if [[ ! "$API_KEY" =~ ^sk- ]]; then
    echo "⚠️  Warning: API key should start with 'sk-'"
    read -p "Continue anyway? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "❌ Aborted."
        exit 1
    fi
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend directory not found: $BACKEND_DIR"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "📄 Creating new .env file..."
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

# Check if OPENAI_API_KEY already exists
if grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
    echo "⚠️  OPENAI_API_KEY already exists in .env file"
    echo ""
    echo "Current value:"
    grep "^OPENAI_API_KEY=" "$ENV_FILE" | sed 's/=.*/=***hidden***/'
    echo ""
    read -p "Do you want to update it? (y/n): " update_confirm
    if [ "$update_confirm" = "y" ]; then
        # Remove old key
        sed -i '/^OPENAI_API_KEY=/d' "$ENV_FILE"
        echo "✅ Removed old OPENAI_API_KEY"
    else
        echo "❌ Aborted. Keeping existing key."
        exit 0
    fi
fi

# Add new API key
echo "" >> "$ENV_FILE"
echo "# OpenAI API Key for Chatbot AI" >> "$ENV_FILE"
echo "OPENAI_API_KEY=$API_KEY" >> "$ENV_FILE"

echo ""
echo "✅ OPENAI_API_KEY has been added to $ENV_FILE"
echo ""
echo "🔍 Verifying..."
if grep -q "^OPENAI_API_KEY=$API_KEY$" "$ENV_FILE"; then
    echo "✅ Verification successful!"
else
    echo "⚠️  Warning: Could not verify the key was added correctly"
fi

echo ""
echo "📋 Next steps:"
echo "1. Restart the backend service:"
echo "   pm2 restart laumam-backend"
echo ""
echo "2. Check the logs to verify:"
echo "   pm2 logs laumam-backend --lines 20"
echo ""
echo "3. Look for this message in the logs:"
echo "   ✅ OpenAI client initialized successfully"
echo ""
echo "✨ Done! The chatbot should work after restarting the backend."

