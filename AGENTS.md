# GM Terminal Agent Spawning Guide

This file documents how to spawn AI agents for GM Terminal development.

## Cursor Subagents (Recommended)

Three coordinated subagents live in `.cursor/agents/`:

| Subagent | File | Role |
|----------|------|------|
| **gm-frontend** | `.cursor/agents/gm-frontend.md` | React panes, CLI, Zustand, Tailwind, API integration |
| **gm-backend** | `.cursor/agents/gm-backend.md` | Hono routes, services, Prisma, WebSocket, Workers |
| **gm-ship** | `.cursor/agents/gm-ship.md` | Code review, debugging, build validation, PRs |

### How to Invoke

```
Use the gm-backend subagent to add a /api/data/most-active endpoint
```

```
Use the gm-frontend subagent to add a MostActivePane and CLI command
```

```
Use the gm-ship subagent to validate the most-active feature end-to-end
```

### Coordinated Feature Flow

Subagents have no shared memory — they coordinate via **structured handoff blocks** in their responses:

```
1. gm-backend  → Defines shared types + API contract → Backend Handoff block
2. gm-frontend → Builds pane + CLI (can start once contract is defined) → Frontend Handoff block
3. gm-ship     → Validates builds, reviews code, checks contract alignment → Ship Report block
```

For maximum parallelism, invoke backend and frontend in the same turn once the API contract is agreed. Ship runs last (or on any build failure).

## Quick Reference

### Spawn All 4 Agents (Full Stack Feature)

```typescript
delegate_task({
  tasks: [
    {
      goal: "Implement [FEATURE] on the backend — Hono routes, Prisma changes, API endpoints",
      context: "Project: ~/Desktop/GMv2-main/backend | Stack: Hono + Cloudflare Workers + Prisma + Supabase | Docs: ~/Desktop/Brain/00-Projects/GMv2-MacroTerm/",
      toolsets: ["terminal", "file"]
    },
    {
      goal: "Implement [FEATURE] on the frontend — React components, Tailwind styling, API integration",
      context: "Project: ~/Desktop/GMv2-main/frontend | Stack: React + Vite + TypeScript + Tailwind + Zustand | Docs: ~/Desktop/Brain/02-Architecture/frontend-standards.md",
      toolsets: ["terminal", "file", "web"]
    },
    {
      goal: "Research and plan [FEATURE] — check COMPLETE_FEATURE_LIST.md, research market data options, document in Brain",
      context: "Docs: ~/Desktop/GMv2-main/COMPLETE_FEATURE_LIST.md | Brain: ~/Desktop/Brain/00-Projects/GMv2-MacroTerm/",
      toolsets: ["terminal", "web"]
    },
    {
      goal: "Code review, validate, create PR — run build, check TypeScript, open PR with changelog",
      context: "Project: ~/Desktop/GMv2-main | Use 'gh pr create' to open PR | Branch: feature/[name]",
      toolsets: ["terminal", "file"]
    }
  ]
})
```

### Spawn Single Agent

```typescript
delegate_task({
  goal: "Your task description",
  context: "Project path, stack info, any constraints",
  toolsets: ["terminal", "file", "web"]
})
```

## Agent Roles

| Agent | Focus | Toolsets |
|-------|-------|----------|
| **Backend** | API, Hono, Prisma, Supabase, Cloudflare Workers | terminal, file |
| **Frontend** | React, Vite, Tailwind, components, UX | terminal, file, web |
| **Product** | Features, research, market data, decisions | terminal, web |
| **Ship** | PRs, validation, deployment | terminal, file |

## Communication Protocol

1. **Spawn agents** with clear task descriptions
2. **Agents work independently** on their parts
3. **Each agent commits** with descriptive messages
4. **Ship agent creates PR** when ready
5. **You review and approve** in GitHub

## Typical Feature Flow

1. **Product Agent** → "Research adding MOST ACTIVE command"
2. **Backend Agent** → "Add /api/data/most-active endpoint"
3. **Frontend Agent** → "Add MostActivePane component"
4. **Ship Agent** → "Validate build, open PR"

## Shell Helper

For convenience, there's also a shell script:
```bash
cd ~/Desktop/GMv2-main
./scripts/spawn-agents.sh full-stack "add-options-chain-command"
```

## GitHub Integration

### Create PR
```bash
cd ~/Desktop/GMv2-main
git checkout -b feature/my-feature
# make changes
git add . && git commit -m "feat: add options chain command"
git push -u origin feature/my-feature
gh pr create --title "feat: Options Chain Command" --body "## Summary\n- Added options chain data\n- New MostActivePane component\n\n## Testing\n- [ ] Tested locally\n- [ ] Build passes"
```

### Check PR Status
```bash
gh pr status
gh pr view 1 --web  # open in browser
```

## Skills

- Skill for spawning: `gm-terminal-multi-agent` (load with skill_view)
- Full agent workflow: `hermes-agent` skill

## Notes

- Each agent runs in isolation with no memory of other agents
- Always include full context in the `context` parameter
- Document decisions in Brain after completion
- Update `~/Desktop/Brain/00-Projects/GMv2-MacroTerm/progress.md` when done