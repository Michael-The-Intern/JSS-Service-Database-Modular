# Service Database

A React + Vite application for tracking service part lifecycle, archive review, pricing, and quality management.

## Project Structure

```
src/
├── main.jsx                     # Entry point
├── App.jsx                      # Root component (routing, auth, sidebar)
├── index.css                    # Global styles
├── lib/
│   └── supabase.js              # Supabase client + persistence helpers
└── components/
    ├── shared/                  # Reusable UI components
    │   ├── Badge.jsx            # Badge, DQBadge, ArchiveBadge
    │   ├── GlobalSearch.jsx     # App-wide search overlay
    │   ├── MultiSelectDropdown.jsx
    │   ├── PriceInput.jsx
    │   ├── SearchBox.jsx
    │   ├── StatCard.jsx
    │   └── Table.jsx
    ├── archive/                 # Archive Review page
    ├── action-queues/           # Action Queues page
    ├── admin/                   # Admin Roles management
    ├── audit/                   # Audit History page
    ├── dashboard/               # Main Dashboard
    ├── detail/                  # Part Detail Panel
    ├── dq/                      # Data Quality Center
    ├── import/                  # Excel Import Wizard
    ├── master/                  # Master Terminal
    ├── notifications/           # Notifications Panel
    ├── pricing/                 # Service Price Review
    ├── quickactions/            # Quick Actions widget
    ├── reference/               # Reference Data management
    ├── reports/                 # Reports & Exports
    └── service-life/            # Service Life Phase page
```

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production (Azure Static Web Apps)

```bash
npm run build
# Output goes to dist/ — point Azure SWA to this folder
```

## Environment Variables

Create a `.env` file (never commit this):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then update `src/lib/supabase.js` to use `import.meta.env.VITE_SUPABASE_URL` etc.

## Azure Deployment

See `AZURE_DEPLOY.md` for step-by-step Azure Static Web Apps deployment guide.
