# Overview

This is a full-stack road construction project management application built with React, Express.js, and PostgreSQL. The system enables construction professionals to track projects, manage roads, monitor construction layers, and record progress through an intuitive web interface. It features comprehensive project lifecycle management from planning to completion with real-time progress tracking, financial tracking, work plan scheduling, and visual progress indicators. The platform, branded as "ConstructTrack," is designed to handle multiple project types, including Roads, Buildings, Infrastructure, and Bridges.

Key capabilities include:
- **Project Lifecycle Management**: From planning to completion with real-time progress tracking.
- **Financial Tracking**: Manage payment certificates and track financial progress.
- **Work Plan Scheduling**: Plan and track project activities with start dates, durations, and milestones.
- **Comprehensive Project Information**: Track client and contractor personnel, and contractor equipment.
- **Multi-Project Type Support**: Adaptable for various construction project types beyond just roads.
- **Team Collaboration**: Facilitates collaboration among project stakeholders.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with React 18, TypeScript, Wouter for routing, Radix UI/shadcn/ui for components, Tailwind CSS for styling, TanStack Query for server state, React Hook Form with Zod for forms, and Vite for building. It uses a component-based, responsive design with custom hooks for authentication and API interactions.

## Backend Architecture

The backend uses Express.js with TypeScript, following a RESTful API design. It integrates Drizzle ORM for database operations, Replit Auth with OpenID Connect for authentication, and Express sessions with PostgreSQL storage. The architecture is layered, separating routing, business logic, and data access, with centralized error handling.

## Database Design

PostgreSQL database with a normalized schema covering:
- **Users**: Authentication and profile information.
- **Projects**: Core project metadata, including type, budget, and date ranges.
- **Client & Contractor Personnel**: Details of personnel associated with each project.
- **Contractor Equipment**: Inventory for each project's contractor.
- **Payment Certificates**: Tracking financial certificates, amounts, and payment status.
- **Work Plan Activities**: Project scheduling with activity names, dates, and milestones.
- **Roads**: Specific road segments within projects with length and type.
- **Construction Layers**: Different construction phases (e.g., Excavation, Sub Grade, Base, Asphalt Concrete).
- **Layer Progress**: Granular progress tracking by chainage ranges and quality status.
- **Sessions**: Secure session storage.

## Authentication & Authorization

The application uses local username/password authentication with Bcrypt hashing and PostgreSQL-backed sessions (1-week TTL). All project and data routes are protected. A development mode bypass allows for faster iteration with a default "devuser" account when `NODE_ENV=development`. The authentication flow redirects authenticated users to `/projects` and unauthenticated users to the `/auth` page for sign-in/sign-up. Users can only access their own project data.

## Key Features

- **Project Management**: CRUD operations for projects, including duplication.
- **Road Tracking**: Manage detailed specifications for roads within projects.
- **Layer Management**: Track construction phases with weighted progress calculation.
- **Progress Recording**: Record completion by chainage ranges with date and quality.
- **Visual Progress**: Real-time progress bars comparing planned vs. actual completion.
- **Work Plan Scheduling**: Plan activities with start dates, durations, and milestone flags. Includes section headers for organizing activities into categorized groups with visual indentation. Kebab menu on each row allows inserting section headers above or below any item.
- **Team Collaboration**: Invite collaborators with role-based access (owner/collaborator).
- **File Storage**: Upload and manage construction files (photos, documents) via an abstraction layer.
- **Data Validation**: Client and server-side validation using Zod.
- **Responsive Design**: Mobile-friendly interface.
- **Financial Tracking**: Manage payment certificates, track advance payments, and calculate financial progress.
- **Enhanced Project Information**: Track client/contractor personnel and equipment within project details.
- **Multi-Project Type Platform**: Supports various project types beyond roads (Building, Infrastructure, Bridge, Other) with conditional features.
- **Dashboard**: Provides key metrics for overall project oversight.

## Deployment & Environment Configuration

The application supports development (Replit) and production (Vercel + Supabase) environments.
- **Development**: Replit's PostgreSQL, in-memory mock storage.
- **Production**: Supabase PostgreSQL, Supabase Storage for files.
- **Environment Variables**: `DATABASE_URL`, `SESSION_SECRET` are required. Production also requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend), and `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend).
- **Storage Abstraction**: Uses `server/storage-service.ts` to switch between in-memory mock and Supabase Storage based on environment configuration.

# External Dependencies

- **PostgreSQL**: Primary database for all application data and session storage.
- **Replit Auth**: Used for authentication integration via OpenID Connect.
- **Supabase**:
    - **Supabase PostgreSQL**: Production database solution.
    - **Supabase Storage**: For storing files (images, documents) in production.
- **Vercel**: Hosting platform for production deployment.