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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)