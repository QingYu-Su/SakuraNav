# Directory Structure

```
SakuraNav/
├── public/                          # Static assets
│   ├── browser-tab-logo.png         # Browser tab logo
│   └── default-site-logo.png        # Default site logo
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # Homepage (SSR initial data loading)
│   │   ├── layout.tsx               # Root layout (3 Google fonts, theme init script)
│   │   ├── not-found.tsx            # 404 page (reuses login page background and UI style)
│   │   ├── globals.css              # Global styles (Tailwind CSS 4, custom animations)
│   │   ├── icon.png                 # App Icon
│   │   ├── editor/page.tsx          # Editor admin panel (requires admin auth)
│   │   ├── card/[id]/page.tsx       # Social card detail page (generic, supports all ID+QR types and email)
│   │   ├── [...slug]/page.tsx       # Catch-all route (unmatched paths return 404)
│   │   ├── login/page.tsx           # Login/Register page (fixed route, supports OAuth)
│   │   ├── profile/                 # Personal space
│   │   │   ├── page.tsx             # Page entry (auth check)
│   │   │   ├── profile-client.tsx   # Personal space client component (main logic + UI)
│   │   │   └── profile-dialogs.tsx  # Dialog component collection (password/unbind/delete/username, etc.)
│   │   ├── register-switch/         # Registration page for user switching scenario
│   │   │   └── page.tsx             # Returns to homepage after registration (not login page)
│   │   ├── setup/                   # Admin initialization wizard (first startup)
│   │   │   └── page.tsx             # Setup page (create admin account)
│   │   └── api/                     # Backend API routes
│   │       ├── health/              # Health check
│   │       ├── auth/                # Authentication endpoints
│   │       │   ├── login/           # Login
│   │       │   ├── logout/          # Logout
│   │       │   ├── register/        # Register
│   │       │   ├── switch/          # Password-free user switching
│   │       │   ├── session/         # Session state
│   │       │   ├── oauth-providers/ # Public OAuth provider list
│   │       │   └── oauth/[provider]/ # OAuth login (redirect + callback)
│   │       ├── sites/               # Site management
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── batch/           # Batch site creation (bookmark import)
│   │       │   ├── check-online/      # Batch online check
│   │       │   ├── check-online-single/ # Single site online check (instant)
│   │       │   ├── memo/              # Memo notes update (PATCH notes/todos)
│   │       │   └── reorder-global/  # Global reordering
│   │       ├── tags/                # Tag management
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── reorder/         # Tag reordering
│   │       │   └── [tagId]/sites/   # Tag-site operations
│   │       │       ├── reorder/     # Reorder within tag
│   │       │       └── restore/     # Restore tag-site association (undo delete)
│   │       ├── appearance/          # Appearance config
│   │       ├── settings/            # App settings
│   │       ├── navigation/          # Navigation data (public endpoints)
│   │       │   ├── cards/           # All cards list (sites + social + notes)
│   │       │   ├── site-cards/      # Site card list (only empty card_type)
│   │       │   ├── social-cards/    # Social card list
│   │       │   ├── note-cards/      # Note card list
│   │       │   └── tags/            # Visible tags list
│   │       ├── assets/              # Asset management
│   │       │   ├── wallpaper/       # Wallpaper upload
│   │       │   ├── cleanup/        # Orphan icon resource cleanup (delayed delete)
│   │       │   └── [assetId]/file/  # Asset file access
│   │       ├── config/              # Config import/export (admin global level)
│   │       │   ├── detect/          # Import file type detection
│   │       │   ├── export/          # Export ZIP
│   │       │   ├── import/          # Import ZIP
│   │       │   └── reset/           # Reset to defaults
│   │       ├── search/              # Search
│   │       │   └── suggest/         # Search suggestions
│   │       ├── cards/               # Social card management
│   │       │   ├── route.ts         # CRUD (GET / POST / PUT / DELETE)
│   │       │   ├── [id]/route.ts    # Single card public endpoint (no auth required)
│   │       │   ├── note/            # Note card management (CRUD, stored in sites table card_type='note')
│   │       │   │   ├── img/         # Note image access (disguised URL, doesn't expose asset system)
│   │       │   │   ├── file/        # Note file download (disguised URL, Content-Disposition: attachment)
│   │       │   │   ├── attach/      # Note attachment download (legacy compat, kind='note-attachment')
│   │       │   │   ├── attachment/  # Note attachment management (legacy compat, upload/list/rename/delete, max 100MB)
│   │       │   │   ├── upload-image/  # Note image upload (editor paste or / command, max 10MB)
│   │       │   │   └── upload-file/   # Note file upload (editor paste or / command, max 100MB)
│   │       │   └── reorder/         # Card reordering
│   │       ├── admin/               # Admin endpoints
│   │       │   ├── bootstrap/       # Bootstrap initialization data
│   │       │   ├── registration/    # Registration toggle management
│   │       │   ├── users/           # User management (list/role/delete)
│   │       │   └── oauth/           # OAuth config management
│   │       │       ├── route.ts     # GET/PUT provider config
│   │       │       └── test/        # POST connectivity test
│   │       ├── user/                # User endpoints (auth required)
│   │       │   ├── profile/         # Get/update user profile (nickname)
│   │       │   ├── avatar/          # Upload/delete avatar
│   │       │   ├── password/        # Change password
│   │       │   ├── username/        # Change username (once only)
│   │       │   ├── oauth-bind/      # OAuth binding management (GET/DELETE)
│   │       │   ├── data/            # User-level data operations (import/export/reset/check)
│   │       │   │   ├── export/      # Export user data as ZIP
│   │       │   │   ├── import/      # Import from ZIP to user space
│   │       │   │   ├── reset/       # Reset user data
│   │       │   │   ├── clear/       # Clear user tags and sites
│   │       │   │   └── detect/      # Detect import file type
│   │       │   └── delete-account/  # Delete account
│   │       ├── setup/               # Admin initialization wizard (first startup)
│   │       ├── floating-buttons/    # Floating button config (GET/PUT)
│   │       ├── snapshots/           # Snapshot management (GET/POST/DELETE/PATCH)
│   │       ├── notifications/       # Notification config (Webhook channel CRUD + test)
│   │       │   ├── route.ts         # GET list / POST create
│   │       │   ├── test-preview/    # POST test with form data (used in create dialog)
│   │       │   └── [id]/            # Single item operations
│   │       │       ├── route.ts     # PUT update / PATCH toggle / DELETE delete
│   │       │       └── test/        # POST send test notification
│   │       └── ai/                  # AI endpoints
│   │           ├── recommend/       # AI smart recommendations
│   │           ├── workflow/        # AI workflow planning (chain site steps based on user needs)
│   │           ├── analyze-site/    # AI site analysis
│   │           ├── check/           # AI connectivity check
│   │           └── import-bookmarks/ # AI bookmark analysis
│   │
│   ├── components/                  # React components
│   │   ├── sakura-nav/              # Main app components (Composition Root architecture)
│   │   ├── admin/                   # Admin panel components
│   │   ├── auth/                    # Auth-related components
│   │   ├── dialogs/                 # Dialog components
│   │   └── ui/                      # Base UI components
│   │
│   ├── lib/                         # Utility libraries
│   │   ├── base/                    # Base modules (types/api/auth/logger)
│   │   ├── config/                  # Config modules (server-config/schemas/config)
│   │   ├── database/                # Database core (adapter/dialect/connection/migration/seed)
│   │   ├── utils/                   # Utility functions
│   │   └── services/                # Service layer (Repository pattern)
│   │
│   ├── hooks/                       # Custom Hooks
│   │   ├── use-sakura-nav-orchestrator.ts # Orchestrator Hook (Composition Root)
│   │   ├── use-theme.ts             # Theme switching
│   │   ├── use-site-list.ts         # Site list management (paginated loading)
│   │   ├── use-appearance.ts        # Appearance config
│   │   ├── use-drag-sort.ts         # Drag & drop sorting
│   │   ├── use-search-bar.ts        # Search bar state management
│   │   ├── use-search-engine-config.ts # Search engine config management
│   │   ├── use-ai-recommend.ts      # AI smart recommendations
│   │   ├── use-toast-notify.ts      # Toast notifications
│   │   ├── use-config-actions.ts    # Config operations
│   │   ├── use-site-tag-editor.ts   # Site tag editor
│   │   ├── use-site-name.ts         # Site name management
│   │   ├── use-online-check.ts      # Site online check
│   │   ├── use-undo-stack.ts        # Undo stack
│   │   ├── use-editor-console.ts    # Editor console
│   │   ├── use-social-cards.ts      # Social card management
│   │   ├── use-switch-user.ts       # User switching
│   │   ├── use-session-expired.ts   # Session expiry detection & dialog management
│   │   ├── use-tag-delete.ts        # Tag deletion
│   │   └── use-snapshots.ts         # Snapshot management
│   │
├── storage/                         # Data storage (auto-generated after first run, do not modify manually)
│   ├── database/
│   │   └── sakuranav.sqlite         # SQLite database
│   └── uploads/                     # Uploaded files directory
│
├── config.example.yml               # Config file template
├── build-and-run.js                 # Build and run script
└── package.json                     # Project config
```
