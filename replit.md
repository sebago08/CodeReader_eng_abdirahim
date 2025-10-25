# Overview

This is a full-stack road construction project management application built with React, Express.js, and PostgreSQL. The system enables construction professionals to track projects, manage roads, monitor construction layers, and record progress through an intuitive web interface. It features comprehensive project lifecycle management from planning to completion with real-time progress tracking and visual progress indicators.

The application features a landing page, authentication page, and protected dashboard:
1. **Landing Page** (`/`) - Professional homepage with ConstructTrack branding and authentication buttons (Sign In, Sign Up)
2. **Auth Page** (`/auth`) - Authentication page with tabbed interface for Sign In and Sign Up
3. **Projects Overview** (`/projects`) - Displays all projects in a grid with summary information (requires authentication)
4. **Project Detail** (`/projects/:id`) - Shows detailed view of a single project with roads, layers, and progress visualization (requires authentication)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with React 18 using TypeScript and modern build tooling:

- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui for consistent, accessible components
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation schemas
- **Build Tool**: Vite for fast development and optimized production builds

The application uses a component-based architecture with reusable UI components, modal-based workflows for data entry, and responsive design patterns. Custom hooks abstract authentication logic and API interactions.

## Backend Architecture

The backend follows a RESTful API design using Express.js:

- **Framework**: Express.js with TypeScript for server-side logic
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Structure**: Resource-based routes with proper HTTP methods and status codes
- **Error Handling**: Centralized error handling middleware with structured error responses

The server implements a layered architecture with separate concerns for routing, business logic, and data access through a storage interface pattern.

## Database Design

PostgreSQL database with normalized schema design:

- **Users**: Authentication and profile information
- **Projects**: Core project metadata with date ranges and client information
- **Roads**: Individual road segments within projects with length and type classification
- **Construction Layers**: Different construction phases with weight-based progress calculation. Available layers: Excavation & Earthwork, Bottom Sub Grade, Top Sub Grade, Bottom Sub Base, Top Sub Base, Base, and Asphalt Concrete
- **Layer Progress**: Granular progress tracking with chainage ranges, completion dates, and quality status
- **Sessions**: Secure session storage for authentication

The schema uses foreign key relationships to maintain data integrity and supports complex queries for progress calculation and reporting.

## Authentication & Authorization

The application uses traditional username/password authentication with secure password hashing:

- **Authentication Type**: Local username/password authentication
- **Password Security**: Bcrypt password hashing with salt
- **Session Management**: PostgreSQL-backed sessions with 1-week TTL
- **Protected Routes**: All project and data routes require authentication
- **User Registration**: New users can create accounts with username, password, and optional profile information
- **Auth Flow**: 
  - Unauthenticated users see the landing page at `/`
  - Landing page has "Sign In" and "Sign Up" buttons that navigate to `/auth`
  - Auth page provides both "Sign In" and "Sign Up" tabs
  - Users must register with username (min 3 chars) and password (min 6 chars)
  - Optional fields: email, first name, last name
  - After successful authentication, users are redirected to Projects Dashboard (`/projects`)
  - Logout button in header logs out user and redirects to landing page (`/`)
  - Authenticated users visiting `/` are automatically redirected to `/projects`
- **User Data**: Each user can only access and manage their own projects and data

## Key Features

- **Project Management**: Create, edit, duplicate, and delete construction projects
- **Road Tracking**: Manage multiple roads per project with detailed specifications
- **Layer Management**: Track different construction phases with weighted progress calculation
- **Progress Recording**: Record completion by chainage ranges with date and quality tracking
- **Visual Progress**: Real-time progress bars comparing planned vs actual completion
- **Team Collaboration**: Project owners can invite collaborators by username, with role-based access (owner/collaborator)
- **File Storage**: Support for uploading and managing construction files (photos, documents) via abstraction layer
- **Data Validation**: Client and server-side validation using Zod schemas
- **Responsive Design**: Mobile-friendly interface with touch-optimized interactions

## Deployment & Environment Configuration

The application is designed to work seamlessly in dual environments:

### Development Environment (Replit)
- **Database**: Replit's built-in PostgreSQL (via `DATABASE_URL` environment variable)
- **File Storage**: Mock in-memory storage for quick development
- **Session Storage**: PostgreSQL-backed sessions
- **Build Tool**: Vite dev server with hot module replacement

### Production Environment (Vercel + Supabase)
- **Database**: Supabase PostgreSQL (connection string via `DATABASE_URL`)
- **File Storage**: Supabase Storage for images and documents
- **Session Storage**: Same PostgreSQL-backed sessions (works with Supabase)
- **Hosting**: Vercel serverless deployment
- **Build**: Static frontend + serverless API functions

### Environment Variables

**Required for Both Environments:**
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Random secret for session encryption

**Required for Production (Supabase):**

*Server-side (Backend - KEEP SECRET):*
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for file operations (**CRITICAL**: Never expose to frontend!)

*Client-side (Frontend - Safe to expose):*
- `VITE_SUPABASE_URL`: Frontend Supabase URL (must have VITE_ prefix)
- `VITE_SUPABASE_ANON_KEY`: Frontend Supabase anonymous key (must have VITE_ prefix)

### Storage Abstraction Layer

The application uses a storage service abstraction (`server/storage-service.ts`) that automatically switches between:
- **Development**: In-memory mock storage for quick testing
- **Production**: Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured

This allows developers to work locally without Supabase while maintaining production-ready code.

### Deployment Process

1. **Push to GitHub**: Use Replit's Git integration to push code
2. **Set up Supabase**: Create project, run `npm run db:push` to migrate schema
3. **Deploy to Vercel**: Connect GitHub repo, configure environment variables
4. **Configure Storage**: Create Supabase storage bucket named `construction-files`

See `DEPLOYMENT.md` for detailed step-by-step instructions.

## Recent Changes (October 2024)

- Added Supabase SDK integration for production deployment
- Created storage abstraction layer for file uploads
- Added API routes for file upload/download/delete operations
- Implemented team collaboration with owner/collaborator roles
- Added username display to application headers
- Created visual "Collaborator" badge for shared projects
- Prepared Vercel deployment configuration