#!/bin/bash

# Script to check and diagnose chatbot configuration issues
# Usage: ./check-chatbot-config.sh

echo "🔍 Checking Chatbot Configuration..."
echo ""

BACKEND_DIR="apps/backend"
ENV_FILE="$BACKEND_DIR/.env"
PROJECT_ROOT=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Backend directory exists
echo "1️⃣  Checking backend directory..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    echo "   Current directory: $PROJECT_ROOT"
    echo "   Please run this script from the project root directory."
    exit 1
else
    echo -e "${GREEN}✅ Backend directory found${NC}"
fi

# Check 2: .env file exists
echo ""
echo "2️⃣  Checking .env file..."
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env file not found at: $ENV_FILE${NC}"
    echo "   You need to create this file and add OPENAI_API_KEY"
    exit 1
else
    echo -e "${GREEN}✅ .env file found${NC}"
    echo "   Location: $ENV_FILE"
fi

# Check 3: OPENAI_API_KEY exists in .env
echo ""
echo "3️⃣  Checking OPENAI_API_KEY in .env file..."
if grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
    API_KEY_LINE=$(grep "^OPENAI_API_KEY=" "$ENV_FILE")
    API_KEY_VALUE=$(echo "$API_KEY_LINE" | cut -d'=' -f2-)
    
    if [ -z "$API_KEY_VALUE" ]; then
        echo -e "${RED}❌ OPENAI_API_KEY is empty in .env file${NC}"
        exit 1
    fi
    
    # Check format
    if [[ "$API_KEY_VALUE" =~ ^sk- ]]; then
        echo -e "${GREEN}✅ OPENAI_API_KEY found and format looks correct${NC}"
        echo "   Key starts with: ${API_KEY_VALUE:0:7}..."
        KEY_LENGTH=${#API_KEY_VALUE}
        echo "   Key length: $KEY_LENGTH characters"
    else
        echo -e "${YELLOW}⚠️  OPENAI_API_KEY found but format may be invalid${NC}"
        echo "   Key should start with 'sk-'"
        echo "   Key starts with: ${API_KEY_VALUE:0:10}..."
    fi
else
    echo -e "${RED}❌ OPENAI_API_KEY not found in .env file${NC}"
    echo "   Please add: OPENAI_API_KEY=sk-your-api-key-here"
    exit 1
fi

# Check 4: File permissions
echo ""
echo "4️⃣  Checking .env file permissions..."
PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%A" "$ENV_FILE" 2>/dev/null)
if [ "$PERMS" = "600" ] || [ "$PERMS" = "640" ] || [ "$PERMS" = "644" ]; then
    echo -e "${GREEN}✅ File permissions: $PERMS (OK)${NC}"
else
    echo -e "${YELLOW}⚠️  File permissions: $PERMS${NC}"
    echo "   Recommended: 600 (more secure)"
fi

# Check 5: PM2 process
echo ""
echo "5️⃣  Checking PM2 backend process..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "laumam-backend"; then
        PM2_STATUS=$(pm2 jlist | grep -A 5 "laumam-backend" | grep -o '"pm2_env":{"status":"[^"]*"' | cut -d'"' -f6 || echo "unknown")
        if [ "$PM2_STATUS" = "online" ]; then
            echo -e "${GREEN}✅ PM2 process 'laumam-backend' is running${NC}"
            echo "   Status: $PM2_STATUS"
        else
            echo -e "${YELLOW}⚠️  PM2 process 'laumam-backend' status: $PM2_STATUS${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PM2 process 'laumam-backend' not found${NC}"
        echo "   Backend may not be running via PM2"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not installed or not in PATH${NC}"
fi

# Check 6: Check logs for OpenAI initialization
echo ""
echo "6️⃣  Checking backend logs for OpenAI initialization..."
if command -v pm2 &> /dev/null && pm2 list | grep -q "laumam-backend"; then
    LOG_OUTPUT=$(pm2 logs laumam-backend --lines 50 --nostream 2>/dev/null || echo "")
    
    if echo "$LOG_OUTPUT" | grep -q "✅ OpenAI client initialized successfully"; then
        echo -e "${GREEN}✅ Found success message in logs!${NC}"
        echo "   Chatbot should be working correctly."
    elif echo "$LOG_OUTPUT" | grep -q "OPENAI_API_KEY not found"; then
        echo -e "${RED}❌ Found error: OPENAI_API_KEY not found in logs${NC}"
        echo "   This means backend cannot read the API key."
        echo "   Possible causes:"
        echo "   - Backend was not restarted after adding API key"
        echo "   - .env file is not in the correct location"
        echo "   - ConfigModule cannot find the .env file"
    elif echo "$LOG_OUTPUT" | grep -q "Failed to initialize OpenAI client"; then
        echo -e "${RED}❌ Found error: Failed to initialize OpenAI client${NC}"
        echo "   The API key may be invalid or there's a connection issue."
    else
        echo -e "${YELLOW}⚠️  Could not find OpenAI initialization messages in recent logs${NC}"
        echo "   Backend may need to be restarted, or logs are too old."
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check logs (PM2 not available or backend not running)${NC}"
fi

# Check 7: Ecosystem config
echo ""
echo "7️⃣  Checking PM2 ecosystem config..."
if [ -f "ecosystem.config.js" ]; then
    CWD=$(grep -A 5 "laumam-backend" ecosystem.config.js | grep "cwd" | cut -d'"' -f4 || echo "")
    if [ ! -z "$CWD" ]; then
        echo "   PM2 working directory: $CWD"
        if [ "$CWD" = "/home/deploy/Laumamnhatoi-erp/apps/backend" ] || [[ "$CWD" == *"apps/backend" ]]; then
            echo -e "${GREEN}✅ Working directory looks correct${NC}"
            
            # Check if .env exists at that location
            if [ -f "$CWD/.env" ]; then
                echo -e "${GREEN}✅ .env file exists at PM2 working directory${NC}"
            else
                echo -e "${YELLOW}⚠️  .env file NOT found at PM2 working directory: $CWD/.env${NC}"
                echo "   This could be the problem!"
            fi
        else
            echo -e "${YELLOW}⚠️  Working directory may not be correct${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  ecosystem.config.js not found${NC}"
fi

# Summary and recommendations
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RECOMMENDATIONS=()

# Check if we need to restart
if command -v pm2 &> /dev/null && pm2 list | grep -q "laumam-backend"; then
    LOG_OUTPUT=$(pm2 logs laumam-backend --lines 50 --nostream 2>/dev/null || echo "")
    if echo "$LOG_OUTPUT" | grep -q "OPENAI_API_KEY not found"; then
        RECOMMENDATIONS+=("⚠️  RESTART BACKEND: pm2 restart laumam-backend")
    fi
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration looks good!${NC}"
    echo ""
    echo "If chatbot still doesn't work:"
    echo "1. Restart backend: pm2 restart laumam-backend"
    echo "2. Check logs: pm2 logs laumam-backend --lines 30"
    echo "3. Look for: '✅ OpenAI client initialized successfully'"
else
    echo -e "${YELLOW}Action needed:${NC}"
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo "  $rec"
    done
fi

echo ""
echo "📖 For more help, see: CHATBOT-SETUP.md"
echo ""

