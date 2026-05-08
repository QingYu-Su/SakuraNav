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

## Build & Deploy

```bash
# Production build and start
npm run build:start

# Quick build skipping lint
npm run build:start:skip-lint

# Skip build (use existing output)
npm run build:start:skip-build
```
