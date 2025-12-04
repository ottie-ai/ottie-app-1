# Ottie App

A modern fullstack Next.js 14 application built with TypeScript, TailwindCSS, and Shadcn/UI.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/UI** - Beautiful and accessible UI components
- **Vercel** - Deployment platform (configured)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ottie-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── about/             # About page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # Shadcn/UI components
├── lib/                   # Utility functions
└── public/                # Static assets
```

## Available Routes

- `/` - Home page with sample Shadcn/UI components
- `/api/hello` - Sample API route

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

This project is configured for Vercel deployment. Simply connect your repository to Vercel and it will automatically detect the Next.js configuration.

## Adding Shadcn/UI Components

To add more Shadcn/UI components, use the CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

For example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

## Workspace & Plan Logic

### Plan Types

The application supports different subscription plans with different workspace capabilities:

**Single-User Plans** (`max_users = 1`):
- Only one user per workspace
- User profile data is used instead of workspace data
- No workspace settings tab in Settings page
- User's name, avatar, and profile information is displayed everywhere workspace would normally appear
- User = Workspace (they are treated as the same entity)
- Multi-user features (invitations, members, role management, site assignment) are hidden

**Multi-User Plans** (`max_users > 1`):
- Can have multiple users per workspace
- Workspace settings tab is visible in Settings page
- Workspace name, logo, and settings are displayed
- Supports team collaboration features (invitations, members, roles, site assignment)

### Implementation

- **Single Source of Truth**: Multi-user functionality is determined by `max_users` column in `plans` table
- **Client Components**: Use `useAppData().isMultiUserPlan(workspace.plan)` to check if workspace supports multi-user features
- **Server Actions**: Check `max_users` from `plans` table directly
- **Never Hardcode**: Never use hardcoded plan names (e.g., `plan === 'agency'`). Always check `max_users > 1`
- **Workspace Hook**: `hooks/use-workspace.ts` provides workspace data for client components
- **Server Queries**: `lib/supabase/queries.ts` contains `getCurrentUserWorkspace()` for server-side fetching
- **Settings Page**: Conditionally shows workspace tab based on plan type
- **WorkspaceNavbar**: Shows user name for single-user plans, workspace name for multi-user plans

### Multi-User Feature Gating

**IMPORTANT**: When adding new multi-user features, always gate them behind `isMultiUserPlan()` check.

See [Multi-User Workspace Pattern Documentation](./docs/patterns/multi-user-workspace-pattern.md) for detailed implementation guidelines.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)