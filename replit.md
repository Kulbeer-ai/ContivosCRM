# CRM Deal Pipeline

## Overview

A production-ready CRM web application featuring a HubSpot-style deals pipeline with Kanban board and table views. The system enables sales teams to track deals through customizable pipeline stages, manage companies and contacts, log activities, and view pipeline metrics. Built with role-based access control supporting Admin, Manager, and Sales user roles.

## Recent Changes (January 2026)

- Fixed stage dropdown loading in deal creation dialog (query parameters now passed correctly)
- Fixed deal creation with nullable company field (empty strings converted to null)
- Added proper FK constraint handling for delete operations (cascade for pipelines/stages, nullify for companies/contacts)
- Restricted internal deal fields to admin-only access (both UI and API)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management with optimistic updates
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Drag and Drop**: @hello-pangea/dnd for Kanban board functionality
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API endpoints under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`drizzle.config.ts`)

### Key Data Models
- **CRM Users**: Extends auth users with roles (admin/manager/sales) and team assignments
- **Pipelines & Stages**: Customizable sales pipelines with ordered stages and probability percentages
- **Deals**: Core entity with stage tracking, amounts, close dates, and owner assignments
- **Deal Internals**: Admin-only fields for probability overrides, cost estimates, and forecast categories
- **Companies & Contacts**: Customer relationship tracking
- **Activities, Tasks, Notes**: Activity logging and task management

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components including Kanban board
│   ├── pages/           # Page components (deals, companies, contacts, etc.)
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and API client
├── server/              # Express backend
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database operations interface
│   └── replit_integrations/auth/  # Authentication layer
├── shared/              # Shared code between client and server
│   ├── schema.ts        # Drizzle database schema
│   └── models/          # Type definitions
└── migrations/          # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OIDC-based authentication using Replit's identity provider
- Required environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### Key NPM Packages
- **drizzle-orm**: Type-safe database queries
- **@tanstack/react-query**: Async state management
- **@radix-ui/***: Accessible UI primitives
- **@hello-pangea/dnd**: Drag and drop for Kanban
- **passport** + **openid-client**: Authentication handling
- **date-fns**: Date formatting utilities

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side bundling for production
- **tsx**: TypeScript execution for development