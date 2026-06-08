#!/bin/bash
# Slack notification script for GM Terminal agents
# Usage: ./slack-notify.sh "message" [#channel] [icon]

set -e

WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
CHANNEL="${2:-#gm-terminal-updates}"
ICON="${3:-:robot_face:}"

if [ -z "$WEBHOOK_URL" ]; then
    echo "Error: SLACK_WEBHOOK_URL not set"
    exit 1
fi

MESSAGE="$1"
if [ -z "$MESSAGE" ]; then
    echo "Usage: ./slack-notify.sh 'message' [#channel] [icon]"
    exit 1
fi

PAYLOAD=$(cat << EOF
{
    "channel": "$CHANNEL",
    "username": "GM Terminal Agent",
    "icon_emoji": "$ICON",
    "text": "$MESSAGE",
    "attachments": [
        {
            "color": "#00ff88",
            "footer": "GM Terminal v0.1 MVP",
            "footer_icon": ":terminal:"
        }
    ]
}
EOF
)

curl -s -X POST \
    -H 'Content-type: application/json' \
    -d "$PAYLOAD" \
    "$WEBHOOK_URL" > /dev/null

echo "Slack notification sent: $MESSAGE"