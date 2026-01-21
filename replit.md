# CRM Deal Pipeline

## Overview

A production-ready CRM web application featuring a HubSpot-style deals pipeline with Kanban board and table views. The system enables sales teams to track deals through customizable pipeline stages, manage companies and contacts, log activities, and view pipeline metrics. Built with role-based access control supporting Admin, Manager, and Sales user roles.

## Recent Changes (January 2026)

- **Dual Authentication System**: Implemented comprehensive authentication with local email/password and Microsoft Azure AD SSO
  - Local auth: bcrypt password hashing (12 rounds), email-based registration, secure login
  - Microsoft SSO: OAuth 2.0 / OpenID Connect with JWKS-based ID token validation
  - Password reset: Token-based with 24-hour expiry
  - Session management: Express sessions with Passport.js
- **Security Hardening**:
  - Admin-only access to sensitive user data (/api/users requires admin role)
  - Full OIDC ID token validation using jwks-rsa (signature, issuer, audience, expiry)
  - CSRF protection on OAuth callbacks with state parameter
  - Cross-validation of ID token claims against Microsoft Graph API
- **Admin SSO Configuration**: Settings page for tenant IDs, allowed domains, auto-provisioning, default roles
- **User Management**: Admin can view auth providers, enable/disable users, unlink Microsoft accounts
- Fixed stage dropdown loading in deal creation dialog
- Restricted internal deal fields to admin-only access

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
- **Dual Authentication System**: Supports both local email/password and Microsoft Azure AD SSO
- **Local Auth**: Email/password with bcrypt hashing, password reset tokens
- **Microsoft SSO**: OAuth 2.0 / OpenID Connect with JWKS-based token validation
- Required environment variables:
  - `SESSION_SECRET`: Session encryption key
  - `DATABASE_URL`: PostgreSQL connection string
  - For Microsoft SSO (optional):
    - `MICROSOFT_CLIENT_ID`: Azure AD application client ID
    - `MICROSOFT_CLIENT_SECRET`: Azure AD application client secret
    - `MICROSOFT_TENANT_ID`: Azure AD tenant ID (defaults to "common" for multi-tenant)

### Key NPM Packages
- **drizzle-orm**: Type-safe database queries
- **@tanstack/react-query**: Async state management
- **@radix-ui/***: Accessible UI primitives
- **@hello-pangea/dnd**: Drag and drop for Kanban
- **passport** + **passport-local**: Authentication strategies
- **bcrypt**: Secure password hashing
- **jsonwebtoken** + **jwks-rsa**: Microsoft ID token validation
- **date-fns**: Date formatting utilities

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side bundling for production
- **tsx**: TypeScript execution for development