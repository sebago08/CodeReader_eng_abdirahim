# Overview

This is a full-stack road construction project management application built with React, Express.js, and PostgreSQL. The system enables construction professionals to track projects, manage roads, monitor construction layers, and record progress through an intuitive web interface. It features comprehensive project lifecycle management from planning to completion with real-time progress tracking, financial tracking, work plan scheduling, and visual progress indicators. The platform, branded as "ConstructTrack," is designed to handle multiple project types, including Roads, Buildings, Infrastructure, and Bridges.

Key capabilities include:
- **Project Lifecycle Management**: From planning to completion with real-time progress tracking.
- **Financial Tracking**: Manage payment certificates and track financial progress.
- **Work Plan Scheduling**: Plan and track project activities with start dates, durations, and milestones.
- **Comprehensive Project Information**: Track client and contractor personnel, and contractor equipment.
- **Multi-Project Type Support**: Adaptable for various construction project types beyond just roads.
- **Team Collaboration**: Facilitates collaboration among project stakeholders.
- **Rich Text Editing**: TipTap-based rich text editors with bullet lists, numbered lists, and basic formatting across all major text input fields.

# Recent Changes

## October 30, 2025 - Rich Text Editor Integration
- **Created RichTextEditor component** using TipTap library with StarterKit and bullet/numbered list extensions
- **Integrated across all text input fields:**
  - Project Modal: Description, Executive Summary, Scope of Work
  - Daily Logs: Work Summary, Issues/Challenges, Additional Notes  
  - Meeting Minutes: Attendees, Agenda, Discussions & Decisions, Action Items
  - Safety Incidents: Incident Description
  - Progress Tracker: Notes field
  - BOQ Progress Tracker: Description field
- **Features**: Toolbar with bold, bullet lists, numbered lists buttons; stores HTML content; preserves formatting on save/load
- **Implementation**: Uses Controller component for react-hook-form integration; maintains all existing test IDs

## Previous Updates
- Completed Supabase Authentication migration with full security fixes
- Implemented auto-profile creation from verified JWTs
- Secured all API routes with JWT verification  
- Added Google OAuth support via Supabase Auth
- Hybrid authentication middleware supporting Supabase Auth in production and dev mode fallback

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
- **Work Plans**: Multiple work plans per project (e.g., different roads, phases, or subdivisions) with name, description, and default flag. Enables organizing activities into separate schedules.
- **Work Plan Activities**: Project scheduling with activity names, dates, and milestones. Linked to specific work plans via `workPlanId` foreign key. Uses order-based grouping via `orderIndex` instead of parent-child relationships. Activities are grouped under sections purely by their position in the ordered list within their work plan.
- **Progress Trackers**: BOQ-style progress tracking instances linked to projects and optionally to work plans. Contains name and description. Falls back to all project activities if selected work plan has no activities.
- **Progress Tracker Items**: Individual trackable items within a progress tracker, derived from work plan activities. Tracks quantities (qty_in_boq, qty_done), weighted_ratio, and calculated progress percentages.
- **Pre-Commencement Items**: Critical documents and requirements that must be completed before construction begins. Includes 12 default items (Insurance Certificate, Performance Security/Bond, Environmental Impact Assessment, Safety & Health Plan, Labor Compliance Documents, Tax Clearance Certificate, Equipment Inspection Certificates, Site Mobilization Plan, Quality Assurance Plan, Construction Schedule, Material Testing Certificates, Subcontractor Agreements). Tracks status (pending, submitted, approved, rejected), deadlines, submission dates, responsible parties, notes, and file attachments.
- **Daily Logs**: Site diary entries for documenting daily activities. One log per project per date with unique constraint on (projectId, date). Tracks date, weather conditions, work summary, issues/challenges, and additional notes. Linked to action points for follow-up tracking.
- **Action Points**: Follow-up tasks and action items that can be linked to daily logs or standalone. Tracks description, assignedTo, priority (low/medium/high), status (open/completed), and due date. Provides task tracking across the project lifecycle.
- **Roads**: Specific road segments within projects with length and type.
- **Construction Layers**: Different construction phases (e.g., Excavation, Sub Grade, Base, Asphalt Concrete).
- **Layer Progress**: Granular progress tracking by chainage ranges and quality status.
- **Sessions**: Secure session storage.

## Authentication & Authorization

The application uses **Supabase Authentication** with JWT token-based authorization, supporting:
- **Email/Password Authentication**: Traditional signup and login with Supabase Auth
- **Google OAuth**: One-click "Sign in with Google" integration via Supabase
- **JWT Tokens**: Frontend sends JWT tokens in Authorization headers for API requests
- **Auto-Profile Creation**: Backend middleware verifies tokens and auto-creates user profiles from Supabase Auth users
- **Development Mode**: Falls back to auto-login "devuser" when Supabase isn't configured (`NODE_ENV=development`)

**Authentication Flow:**
1. User signs up/logs in via Supabase Auth (email or Google OAuth)
2. Supabase returns JWT access token and refresh token
3. Frontend stores session and sends JWT token with all API requests
4. Backend verifies token and auto-creates/loads user profile
5. All protected routes validate JWT tokens via `supabaseAuthMiddleware`

**Security Features:**
- Server-side JWT verification with Supabase
- Automatic user profile sync from verified tokens
- Session persistence with automatic token refresh
- Protected API endpoints with role-based access control
- Admin-only routes with `supabaseAdminMiddleware`

**Users Database Schema:**
- `authId`: Links to Supabase Auth user ID (unique)
- `email`: User email (unique, required)
- `username`, `firstName`, `lastName`: Profile information
- `password`: Nullable (null for OAuth users, hashed for email/password users)
- `isAdmin`, `isApproved`: Authorization flags

Users can only access their own project data. All project and data routes are protected.

## Key Features

- **Project Management**: CRUD operations for projects, including duplication.
- **Road Tracking**: Manage detailed specifications for roads within projects.
- **Layer Management**: Track construction phases with weighted progress calculation.
- **Progress Recording**: Record completion by chainage ranges with date and quality.
- **Visual Progress**: Real-time progress bars comparing planned vs. actual completion.
- **Work Plan Scheduling**: Plan activities with start dates, durations, and milestone flags. Supports multiple work plans per project for organizing different roads, phases, or subdivisions separately. Work plan selector allows switching between plans or viewing all activities together. Includes section headers for organizing activities into categorized groups with visual indentation. Kebab menu on each row provides four insert options: Insert Section Above/Below and Insert Activity Above/Below, enabling precise positional insertion at any point in the work plan. Features inline editing - double-click any activity or section name to edit directly without dialogs, with auto-edit mode for newly inserted sections. Uses order-based grouping where activities following a section (until the next section) are visually grouped under that section within their work plan. Section date ranges are calculated dynamically from child activities.
- **BOQ Progress Tracking**: Bill of Quantities-style progress tracker derived from work plan activities. Create multiple trackers per project, each containing items from a selected work plan (or all project activities if work plan has no activities). Track quantities (Qty in BOQ, Qty Done), assign weighted ratios for importance, and view real-time progress percentages. Features inline editing of quantities and weights, weighted overall progress calculation, and section headers for organization. Accessible via Progress > BOQ Tracker sub-tab.
- **Pre-Commencement Document Checklist**: Comprehensive checklist for tracking critical documents required before construction begins. Auto-populates 12 essential items for new projects. Features status tracking (pending, submitted, approved, rejected) with color-coded badges, deadline and submission date tracking, responsible party assignment, notes, and document attachment capability. Accessible via Pre-Commencement tab in project edit modal (only visible for existing projects). Includes file upload functionality with support for PDF, DOC, DOCX, JPG, PNG, and Excel files. Shows approval progress counter and allows inline editing of all fields through an intuitive dialog.
- **Daily Site Logs & Action Points**: Comprehensive site diary system for documenting daily activities and tracking follow-up tasks. Daily Logs capture date, weather, work summary, issues, and notes (one per project per date). Action Points track tasks with description, priority (high/medium/low), status (open/completed), assignee, and due dates. Action points can be linked to daily logs or created standalone. Features two-tab interface (Daily Logs + Action Points) with card-based views, inline editing, and embedded action point management within daily log dialogs. Accessible via Site Logs tab in project detail view.
- **Team Collaboration**: Invite collaborators with role-based access (owner/collaborator).
- **File Storage**: Upload and manage construction files (photos, documents) via an abstraction layer. Uses mock storage in development mode and Supabase Storage in production.
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
- **Supabase**:
    - **Supabase Auth**: Authentication service with Google OAuth support. Handles user signup, login, password reset, and social authentication.
    - **Supabase PostgreSQL**: Production database solution.
    - **Supabase Storage**: For storing files (images, documents) in production.
- **Vercel**: Hosting platform for production deployment.

## Setting Up Google OAuth (Optional)

To enable "Sign in with Google" functionality, configure the Google provider in your Supabase dashboard:

1. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Select "Web application" as application type
   - Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret

2. **Configure Supabase:**
   - Open your [Supabase Dashboard](https://app.supabase.com/)
   - Go to "Authentication" > "Providers"
   - Find "Google" and toggle it on
   - Paste your Google Client ID and Client Secret
   - Save the configuration

3. **Test the Integration:**
   - The "Sign in with Google" button will appear on the login/register pages
   - Click it to test the OAuth flow
   - After successful authentication, user profile is auto-created in your database

**Note:** Google OAuth works out-of-the-box in production. For local development, ensure your Supabase project allows `localhost` redirects in the dashboard settings.