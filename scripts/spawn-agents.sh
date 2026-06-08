#!/bin/bash
# Spawn GM Terminal development agents

echo "🤖 GM Terminal Multi-Agent System"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: ./spawn-agents.sh [command] [args...]"
    echo ""
    echo "Commands:"
    echo "  full-stack [feature]    - Run all 4 agents for a feature"
    echo "  backend [task]         - Spawn backend agent only"
    echo "  frontend [task]        - Spawn frontend agent only"
    echo "  product [task]         - Spawn product agent only"
    echo "  ship                    - Spawn code review agent to ship pending changes"
    echo ""
    exit 1
}

spawn_backend() {
    echo -e "${GREEN}Spawning Backend Agent...${NC}"
    echo "Task: $1"
    # Backend agent would be spawned here via Hermes
}

spawn_frontend() {
    echo -e "${GREEN}Spawning Frontend Agent...${NC}"
    echo "Task: $1"
    # Frontend agent would be spawned here via Hermes
}

spawn_product() {
    echo -e "${GREEN}Spawning Product Agent...${NC}"
    echo "Task: $1"
    # Product agent would be spawned here via Hermes
}

spawn_ship() {
    echo -e "${GREEN}Spawning Code Review Agent...${NC}"
    # Ship agent would be spawned here via Hermes
}

if [ $# -eq 0 ]; then
    usage
fi

case $1 in
    full-stack)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Error: Please specify a feature${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Note: This script is for documentation.${NC}"
        echo "In practice, agents are spawned via delegate_task() in Hermes."
        echo ""
        echo "Example Hermes code:"
        echo 'delegate_task({ tasks: ['
        echo '  { goal: "Backend: $2" },'
        echo '  { goal: "Frontend: $2" },'
        echo '  { goal: "Product: $2" },'
        echo '  { goal: "Code Review & PR" }'
        echo ']})'
        ;;
    backend|frontend|product)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Error: Please specify a task${NC}"
            exit 1
        fi
        echo "Note: Agent spawning happens via Hermes delegate_task()"
        ;;
    ship)
        echo "Note: Agent spawning happens via Hermes delegate_task()"
        ;;
    *)
        usage
        ;;
esac