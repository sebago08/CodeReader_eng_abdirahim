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
- **Client Personnel**: Personnel associated with each project's client organization (name, qualification, designation)
- **Contractor Personnel**: Personnel associated with each project's contractor organization (name, qualification, designation)
- **Contractor Equipment**: Equipment inventory for each project's contractor (equipment name, type, quantity, condition)
- **Payment Certificates**: Payment certificate tracking with certificate number, amounts (pending, in-process, paid), date certified, and payment status
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
- **Development Mode Bypass**: 
  - In development (`NODE_ENV=development`), authentication is automatically bypassed
  - A default "devuser" account is automatically created and used for all requests
  - This eliminates the need to log in during development for faster iteration
  - Production mode (`NODE_ENV=production`) always requires proper authentication
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

## Recent Changes (October 2024-2025)

### Phase 3: Financial Tracking with Payment Certificates (Completed - October 25, 2025)
- **Database schema expansion**: Added payment certificates tracking:
  - `payment_certificates` table: Certificate number, pending/in-process/paid amounts (decimal 15,2), date certified, payment status
  - `projects.advancePayment` field: Track advance payment amounts per project
- **Financial Progress tab**: New sub-tab in Progress section with elegant UI featuring:
  - Payment Certificates summary: 4-metric dashboard showing Contract Amount, Total Certified, Amount Left, and Financial Progress with real-time calculations
  - Advance Payment input: Auto-save on blur for seamless data entry
  - Add Certificate form: 5-field inline form (Certificate No, Amount, Date Certified, Payment Status, Add button)
  - Certificates table: Comprehensive view with columns for pending/in-process/paid amounts, color-coded status badges (green=Paid, yellow=In Process, gray=Pending), and delete functionality
  - Real-time totals row: Automatically calculates and displays sum totals for all amount columns
- **API endpoints**: Full CRUD operations for payment certificates (GET, POST, DELETE) plus PATCH endpoint for advance payment updates
- **Financial calculations**: Automatic computation of Total Certified (sum of all paid amounts), Amount Left (contract - certified), and Financial Progress percentage
- **Type safety**: Proper TypeScript types and null handling for all financial data with decimal precision

### Phase 2: Enhanced Project Information & Nested Tabs (Completed - October 25, 2025)
- **Database schema expansion**: Added three new tables:
  - `client_personnel`: Track client organization personnel with qualification and designation
  - `contractor_personnel`: Track contractor organization personnel with qualification and designation
  - `contractor_equipment`: Track contractor equipment inventory with type, quantity, and condition
- **Nested tab navigation in project modal**:
  - **Client tab** with sub-tabs:
    - Client Details: Organization name, contact person, email, phone, address
    - Personnel: Table view with add/delete functionality for client personnel
  - **Contractor tab** with sub-tabs:
    - Contractor Details: Company name, contact person, email, phone, registration number
    - Personnel: Table view with add/delete functionality for contractor personnel  
    - Equipment: Table view with add/delete functionality for contractor equipment
- **Comprehensive API routes**: Full CRUD operations for client personnel, contractor personnel, and contractor equipment
- **Conditional UI logic**: Personnel and equipment tabs are disabled during new project creation to prevent invalid API calls
- **User experience improvements**: Clear messaging when users attempt to add personnel/equipment before saving the project

### Phase 1: Multi-Project Type Platform (Completed)
- **Expanded project types**: Added support for Road, Building, Infrastructure, Bridge, and Other project types
- **Dashboard page**: Created comprehensive dashboard with 4 key metrics (Active Projects, Completed Tasks %, Budget Utilization, Safety Record)
- **Activity tracking**: Implemented project-wide activity management with progress tracking for all project types
- **Budget management**: Added project-level budget tracking with totalBudget and spentAmount fields
- **Safety incidents**: Created safety incident logging system with severity levels and status tracking
- **Tabbed interface**: Reorganized project detail page into 5 tabs (Overview, Progress, Budget, Safety, Team)
- **Conditional features**: Road tracker now appears only for Road-type projects; all other types use standard activity tracking
- **Sidebar navigation**: Added navigation component with Dashboard, Projects, Reports, Settings links
- **Updated branding**: Changed from "Road Construction Tracker" to "ConstructTrack" to reflect expanded scope
- **Default landing page**: Changed authenticated users' default page from /projects to /dashboard

### Phase 0: Initial Features
- Added Supabase SDK integration for production deployment
- Created storage abstraction layer for file uploads
- Added API routes for file upload/download/delete operations
- Implemented team collaboration with owner/collaborator roles
- Added username display to application headers
- Created visual "Collaborator" badge for shared projects
- Prepared Vercel deployment configuration