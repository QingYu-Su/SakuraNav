# Development Guide

## Local Development

```bash
# Install dependencies
npm install

# Copy config file
cp config.example.yml config.yml

# Start dev server
npm run dev
```

## Code Standards

| Standard | Description |
|:---------|:------------|
| TypeScript | Used full-stack to ensure type safety |
| ESLint | Next.js recommended config (core-web-vitals + typescript) |
| Zod | API request parameter runtime validation |

**Naming Conventions**:

| Type | Style | Example |
|:-----|:------|:--------|
| Components | PascalCase | `SiteCard` |
| Functions | camelCase | `getSiteById` |
| Files | kebab-case | `site-repository.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |

## Adding New Features

### Frontend Architecture Extension Convention

The frontend follows the **Composition Root** pattern. When adding/removing/modifying navigation features, follow these extension rules:

```
sakura-nav-app.tsx          ← Fixed skeleton, no modification needed
  └→ useSakuraNavOrchestrator  ← Orchestrator Hook: add new hook calls + assemble Context values
      └→ SakuraNavContext      ← Type definition: add new fields
          ├→ SakuraNavLayout   ← Layout component: add new UI component rendering
          └→ SakuraDialogLayer ← Dialog layer: add new dialog rendering
```

> 💡 **Extension Steps** — When adding a new frontend feature:
> 1. `sakura-nav-context.ts` — Add new fields to the `SakuraNavContextValue` interface
> 2. `use-sakura-nav-orchestrator.ts` — Call the new hook and inject return values into Context
> 3. `sakura-nav-layout.tsx` or `sakura-dialog-layer.tsx` — Consume new Context fields in the appropriate rendering layer
> 4. `sakura-nav-app.tsx` — **No modification needed** (fixed skeleton)

### Complete Development Workflow

```
1. src/lib/base/types.ts          → Define types
2. src/lib/config/schemas.ts      → Add Zod validation schema
3. src/lib/services/              → Add data access layer (Repository)
4. src/app/api/                   → Add API routes
5. src/components/                → Add UI components
6. src/hooks/                     → Add custom hooks
```

## Database Migration

When modifying table structure (SQL in `schema.ts` and `migrations.ts` must be compatible with SQLite/MySQL/PostgreSQL):

```
1. src/lib/database/schema.ts     → Update table structure definition (use standard SQL)
2. src/lib/database/migrations.ts → Add migration logic (use adapter.hasColumn/hasTable for detection)
3. Related Repository              → Update data access layer
```

## Test Scripts

The project provides Python-based automated test scripts for validating API and MCP interface correctness. The scripts use only the Python standard library — no additional dependencies required.

### Prerequisites

- Python 3.7+
- A valid API Token (create one in Profile → Access Tokens)

### API Testing

```bash
# Test all APIs
python scripts/test_api.py --url https://your-site.com --token sak_xxx

# Test a single API
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "GET /api/health"
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "POST /api/tags"

# Test a specific group
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --group tags
```

**Available groups**: `health`, `tags`, `site-cards`, `social-cards`, `note-cards`, `snapshots`, `navigation`, `search`, `user`, `tokens`

### MCP Testing

```bash
# Test all MCP tools
python scripts/test_mcp.py --url https://your-site.com --token sak_xxx

# Test a single MCP tool
python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --tool list_tags

# Test a specific group
python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --group tags
```

**Available groups**: `tags`, `site-cards`, `social-cards`, `note-cards`, `snapshots`, `data`, `cards`

### Output Format

Each test result is printed line by line in the following format:

```
[PASS] GET     /api/health                              200  OK (45ms)
[FAIL] POST    /api/tags                                500  → Expected status 200, got 500
```

A summary report is printed after all tests complete, including pass/fail counts and a list of failures. The script exits with a non-zero code if any tests fail.

### Testing Strategy

- **Read operations**: Directly call and validate response format
- **Write operations**: Full CRUD lifecycle (Create → Read → Update → Delete), ensuring no residual data
- **Destructive operations** (data clear, reset, import, etc.): **Not tested**
- Test data is prefixed with `[API-Test]` or `[MCP-Test]` for easy identification

## Mobile Adaptation Convention

All scenarios involving "mobile vs desktop behavioral differences" must use the utility functions from `src/lib/utils/utils.ts`:

| Function | Purpose |
|:---------|:--------|
| `isMobileViewport()` | Detects whether the current viewport is mobile (< 1024px), SSR-safe (`typeof window` guard) |
| `openUrl(url)` | Current-page navigation on mobile, new tab on desktop |

> 💡 **Extension Convention** — When adding features that require opening external links or navigating to pages, you **must** use `openUrl()` instead of calling `window.open()` directly, ensuring a consistent mobile experience. Use `isMobileViewport()` for mobile detection instead of hardcoding `window.innerWidth < 1024`.

### Mobile Search Bar Layout

The main search bar and floating search bar follow a unified responsive breakpoint convention:
- **Inline buttons** (site search, search submit): `hidden sm:inline-flex`, hidden below 640px
- **Independent button row** (site search, regular search): `sm:hidden`, visible only below 640px

New search-related UI should maintain this breakpoint consistency.

## Build & Deploy

```bash
# Production build and start
npm run build:start

# Quick build skipping lint
npm run build:start:skip-lint

# Skip build (use existing output)
npm run build:start:skip-build
```
