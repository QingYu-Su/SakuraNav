# Undo & Data Portability

## Undo System (`use-undo-stack.ts`)

The undo system is stack-based, supporting undo of site/tag creation, editing, and deletion via Ctrl+Z.

**Core Architecture**:

| Component | File | Responsibility |
|:----------|:-----|:---------------|
| `useUndoStack` | `hooks/use-undo-stack.ts` | Undo stack management (push/pop/clear), returns stack reference |
| `UndoAction` | `components/admin/types.ts` | Undo action type definition (includes `toastSignature` for dedup) |
| `SiteFormState` | `components/admin/types.ts` | Site/tag form snapshot type, data carrier for undo operations |

**Undo Trigger Methods**:
1. **Ctrl+Z shortcut** — `use-sakura-nav-orchestrator.ts` listens for `keydown`, calls `undoStack.pop()` to execute the most recent undo callback
2. **Toast undo button** — After a successful operation, the Toast displays an "Undo" button; clicking triggers undo

**Undo Operation Categories**:

| Operation | Undo Method | Notes |
|:----------|:------------|:------|
| Create site | DELETE new site | Restores global sort order |
| Edit site | PUT original snapshot | Restores icon resource |
| Delete site | POST rebuild site | Restores global sort + in-tag sort + associations |
| Create tag | DELETE new tag | — |
| Edit tag | PUT original snapshot | — |
| Delete tag | POST rebuild tag | Restores tag sort + site associations |
| Delete tag + sites | POST tag first, then sites | **Must restore tag first (FK constraint), then sites** |

### Extensibility Conventions

> 💡 **Rule 1: Field Extension** — Each entity has a **form snapshot function** that maps entity objects to complete snapshots usable for undo. When adding new fields, simply add the mapping in that entity's snapshot function — all undo logic follows automatically via `...snap` spread.

| Entity | Snapshot Function | File |
|:-------|:------------------|:-----|
| Site/Tag | `siteToFormState()` | `components/admin/types.ts` |
| Social Cards | `cardToForm()` | `hooks/use-social-cards.ts` |
| Note Cards | `noteCardToForm()` | `hooks/use-note-cards.ts` |

> 💡 **Rule 2: Type Extension** — Each entity has a **type metadata registry** declaring its subtypes and field mappings. When adding a new subtype, simply add a configuration entry to the registry — CRUD functions and undo logic adapt automatically via metadata-driven logic.

> 💡 **Integrating a New Entity** — The undo stack's `UndoAction` is a **type-agnostic pure interface** (`{ label, undo, toastSignature? }`) that doesn't bind to any data structure. To integrate a new entity:
> 1. Write a CRUD hook, define a snapshot function and (optionally) a type registry
> 2. Pass the undo callback via `setMessage(msg, undoAction)`
> 3. No need to modify `use-undo-stack.ts`, Ctrl+Z listener, Toast undo button, or any other infrastructure

### Delayed Resource Deletion

Edit/delete operations use `pendingDeleteAssetIds` (React ref) to buffer icon resource IDs pending deletion. On undo, IDs are removed from this buffer (preventing accidental deletion). Resources are cleaned up collectively when exiting edit mode or on page refresh.

### Lightweight Refresh Strategy

| Scenario | Refresh Method | Description |
|:---------|:---------------|:------------|
| Site card PUT (edit) | `updateSiteInCache()` in-place update | Only replaces the corresponding entry |
| Tag association change after edit | `syncNavigationData()` | Refreshes tag list to update `siteCount` |
| Social/Note card PUT | Local `setCards(prev => prev.map(...))` | Only updates the corresponding entry |
| Create/Delete/Undo | `syncNavigationData()` + `syncAdminBootstrap()` | Full refresh |

### Note Attachment Delayed Persistence

Attachment tab operations (upload/delete) in edit mode are only marked, not immediately persisted:
1. Uploaded attachments are not associated with `noteId`; tracked uniformly via `pendingAttachmentIds`
2. Deleted attachments are only marked in `deletedAttachmentIds`, removed from local list but API not called
3. On "Save" click, all changes are processed: associate new attachments + soft-delete marked attachments
4. Undo operations are implemented via reverse attachment changes
5. On edit cancel, unassociated orphan attachments are automatically reclaimed in subsequent operations

---

## Data Portability (`data-portability-service.ts`)

The data import/export system follows unified extensibility constraints applicable to any card type and field.

> 💡 **Export** — Uses `SELECT *` to get all columns + blacklist filtering. New fields are automatically exported with no changes needed.

> 💡 **Clean Mode Import** — Uses `dynamicInsert()` to dynamically detect target table structure, only inserting existing columns. New fields are automatically imported.

> 💡 **Incremental/Overwrite Import · INSERT** — Uses `dynamicInsert()` for dynamic detection; new fields are automatically imported.

> 💡 **Incremental/Overwrite Import · UPDATE** — Dynamically builds `SET` clauses by iterating all imported data fields and comparing against table structure. New fields are automatically followed.

> 💡 **Incremental/Overwrite Import · Dedup Matching** — Driven uniformly by `getCardIdentityKey()`:
>
> | card_type | Match Strategy | Identity Key Format |
> |:----------|:---------------|:--------------------|
> | `IS NULL` (regular site) | Normalized URL | `url:<normalizedUrl>` |
> | In `SOCIAL_CARD_TYPE_META` (social card) | Value extracted by `meta.idField` | `<cardType>:<uniqueId>` |
> | `'note'` (note card) | No matching, always INSERT | — |
> | Unknown type (future new cards) | No matching, always INSERT | — |
>
> When adding new card types, register the identity extraction strategy in `SOCIAL_CARD_TYPE_META` or `getCardIdentityKey` to participate in dedup.

> 💡 **card_data Asset Reference Mapping** — `remapCardDataAssets()` generically scans JSON payload for asset references and maps them. Social cards use `/api/assets/{id}/file` format, note cards use `/api/cards/note/img/{id}` and `/api/cards/note/file/{id}` formats.

> 💡 **Appearance Import** — Dynamically builds `INSERT ... ON CONFLICT DO UPDATE SET`, automatically following new columns in the `theme_appearances` table.

> 💡 **site_relations Export/Import Convention** — Included in the portability flow. New fields are automatically followed during export (`SELECT *`); import needs to update the column list in each import function.

### Note Card Extensibility Convention

| Extension Point | File | Description |
|:----------------|:-----|:------------|
| Type definitions `NoteCard` / `NoteCardFormState` | `lib/base/types.ts` + `hooks/use-note-cards.ts` | Sync both when adding new fields |
| Conversion function `siteToNoteCard()` | `lib/base/types.ts` | Parse and map from `site.cardData` JSON |
| Repository layer | `lib/services/site-repository.ts` | Pure SQL queries, no changes needed for new fields |
| API route `/api/cards/note` | `app/api/cards/note/route.ts` | `cardData` JSON serialization/deserialization |
| SSR tag injection | `app/page.tsx` | Injected uniformly via `injectVirtualTags()` |
| Editor / Quick commands | `components/sakura-nav/note-card-editor.tsx` | Input `/` triggers floating menu supporting todo/code/link/table templates and file upload |
| Editor standalone undo | `components/sakura-nav/note-card-editor.tsx` | Ctrl+Z standalone undo stack (independent from global, max 30 entries, 500ms debounce) |
