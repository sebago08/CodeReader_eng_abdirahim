# Overview

This is a full-stack road construction project management application built with React, Express.js, and PostgreSQL. The system enables construction professionals to track projects, manage roads, monitor construction layers, and record progress through an intuitive web interface. It features comprehensive project lifecycle management from planning to completion with real-time progress tracking and visual progress indicators.

The application features a landing page with ConstructTrack branding at `/` and authenticated pages:
1. **Landing Page** - Professional homepage with authentication options (Sign In, Sign Up, Google, Microsoft)
2. **Projects Overview** - Displays all projects in a grid with summary information (requires authentication)
3. **Project Detail** - Shows detailed view of a single project with roads, layers, and progress visualization (requires authentication)

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

The application uses Replit Auth for secure user authentication:

- **Authentication Provider**: Replit Auth with OpenID Connect
- **Supported Login Methods**: Google, Microsoft, GitHub, X (Twitter), Apple, and email/password
- **Session Management**: PostgreSQL-backed sessions with 1-week TTL
- **Protected Routes**: All project and data routes require authentication
- **Auth Flow**: 
  - Unauthenticated users see landing page at `/`
  - All sign-in/sign-up buttons redirect to `/api/login` 
  - After authentication, users are redirected to `/projects`
  - Logout available via `/api/logout` button in header
- **User Data**: Each user can only access and manage their own projects and data

## Key Features

- **Project Management**: Create, edit, duplicate, and delete construction projects
- **Road Tracking**: Manage multiple roads per project with detailed specifications
- **Layer Management**: Track different construction phases with weighted progress calculation
- **Progress Recording**: Record completion by chainage ranges with date and quality tracking
- **Visual Progress**: Real-time progress bars comparing planned vs actual completion
- **Data Validation**: Client and server-side validation using Zod schemas
- **Responsive Design**: Mobile-friendly interface with touch-optimized interactions