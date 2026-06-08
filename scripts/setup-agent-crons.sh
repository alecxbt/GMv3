#!/bin/bash
# Setup autonomous agent cron jobs for GM Terminal

echo "🤖 GM Terminal Autonomous Agent Setup"
echo "==================================="
echo ""

# Check if user wants to set up Slack
read -p "Do you have a Slack webhook URL for agent notifications? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your Slack webhook URL:"
    read -r SLACK_WEBHOOK_URL
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        echo "export SLACK_WEBHOOK_URL='$SLACK_WEBHOOK_URL'" >> ~/.bashrc
        echo "✅ Slack webhook configured"
    fi
else
    echo "Skipping Slack setup"
fi
echo ""

echo "Setting up cron jobs..."
echo ""

# Note: In practice, you'd use the /cronjob tool in Hermes
# This script documents what cron jobs should exist

cat << 'CRONS'
# Backend Agent - Every 6 hours
0 */6 * * * cd ~/Desktop/GMv2-main && ./scripts/spawn-agents.sh backend "improve-api" >> ~/logs/backend-agent.log 2>&1

# Frontend Agent - Every 6 hours (offset by 1 hour)
0 */6 * * * sleep 3600 && cd ~/Desktop/GMv2-main && ./scripts/spawn-agents.sh frontend "improve-ui" >> ~/logs/frontend-agent.log 2>&1

# Product Agent - Daily at 9am
0 9 * * * cd ~/Desktop/GMv2-main && ./scripts/spawn-agents.sh product "research" >> ~/logs/product-agent.log 2>&1

# Ship Agent - Every 12 hours
0 */12 * * * cd ~/Desktop/GMv2-main && ./scripts/spawn-agents.sh ship >> ~/logs/ship-agent.log 2>&1
CRONS

echo ""
echo "Note: Cron jobs are set up via Hermes /cronjob tool, not this script."
echo "This script is for documentation only."