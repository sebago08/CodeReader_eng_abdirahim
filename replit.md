# Overview

"ConstructTrack" is a comprehensive full-stack road construction project management system designed to streamline the project lifecycle from planning to completion. It offers tools for tracking diverse project types (Roads, Buildings, Infrastructure, Bridges), managing specific roads and construction layers, monitoring financial progress, scheduling work plans, and recording daily activities. The platform aims to provide real-time progress indicators and facilitate team collaboration, offering a robust solution for efficient and transparent construction project management with significant market potential in the construction tech sector.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Design

The frontend utilizes React 18, TypeScript, Wouter for routing, Radix UI/shadcn/ui for components, and Tailwind CSS for styling, focusing on a responsive, dark-themed, component-based design. It incorporates custom hooks for authentication and API interactions, and TipTap for rich text editing. Recent updates include a switch to a pure black dark theme, responsive layouts for mobile and tablet devices across all components, and interactive, clickable dashboard cards with detailed modals.

## Technical Implementation

The frontend employs TanStack Query for server state management and React Hook Form with Zod for form handling and validation. The backend is built with Express.js and TypeScript, following a RESTful API design. It uses Drizzle ORM for database interactions and features a layered architecture separating routing, business logic, and data access, along with centralized error handling. Vite is used for frontend building.

## Feature Specifications

**Core Functionality:**
- **Financial Dashboard**: Displays key project metrics like Total Contracts, IPCs Paid, Balance, Projects Behind Schedule, Open Incident Reports, Open Grievances, and Upcoming Milestones, with road-length-weighted progress. Financial cards and status cards are clickable for detailed views.
- **Project Management**: CRUD operations for projects, supporting duplication and various project types.
- **Road & Layer Management**: Detailed tracking of road segments and construction layers with weighted progress calculations.
- **Work Plan Scheduling**: Define activities with start dates, durations, and milestones, supporting multiple work plans and section-based organization.
- **BOQ Progress Tracking**: Bill of Quantities-style progress tracking derived from work plan activities, including quantity tracking, weighted ratios, real-time financial-weighted progress, and a two-level progress system (overall project and individual tracker). Features an explicit "Save Changes" button to prevent data loss.
- **Pre-Commencement Checklist**: Tracks essential documents with status, deadlines, and file attachments.
- **Daily Site Logs & Action Points**: Documents daily activities, issues, and tracks follow-up tasks.
- **World Bank Incident Reporting**: Comprehensive, ESF-compliant system for incident reporting with a 3-tier classification, status workflow, and detailed fields.
- **World Bank Grievance Redress Mechanism (GRM)**: Comprehensive, ESF-compliant grievance tracking system with multi-channel intake, complainant management (including anonymous support), 9 categories, status workflow, priority levels, satisfaction tracking, and escalation/appeal mechanisms. Detailed grievance views are accessible from the overview.
- **Financial Tracking**: Management of payment certificates and financial progress.
- **Team Collaboration**: Role-based access control.
- **File Storage**: Abstracted file management.

**Authentication & Authorization:**
The system uses Passport Local authentication with session-based cookies. Users register with username, email, and password. Frontend hooks manage session state. Backend uses Passport.js with LocalStrategy for email authentication. Sessions are stored server-side with `express-session`.

**User Approval System:**
- New users register but are NOT automatically approved (isApproved = false by default)
- Users must wait for admin approval before they can log in
- When unapproved users try to login, they receive a clear message about pending approval

**Role Hierarchy:**
- **Regular Users**: Can access their own projects and collaborate on shared projects
- **Admin**: Can view all users in the admin dashboard
- **Super Admin**: Full user management capabilities - approve/deactivate users, promote/demote admins, delete accounts

**Managing Users via Supabase Dashboard:**
User approvals and role management can be done directly in the Supabase database:
1. Log in to your Supabase dashboard at https://supabase.com
2. Navigate to your project > Table Editor > users table
3. To approve a user: Set `is_approved` to `true`
4. To make someone an admin: Set `is_admin` to `true`
5. To make someone a super admin: Set both `is_admin` and `is_super_admin` to `true`

**User Table Fields:**
- `is_approved`: Controls whether user can log in (false = pending approval)
- `is_admin`: Grants access to admin dashboard
- `is_super_admin`: Grants full user management capabilities

**Security Notes:**
- All admin endpoints prevent self-modification (can't deactivate/demote/delete yourself)
- The last super admin cannot be deactivated, demoted, or deleted through the API
- When modifying roles directly in Supabase, ensure at least one super admin remains active

Role-based access control is implemented via `isAuthenticated`, `isAdmin`, and `isSuperAdmin` middleware for protected API endpoints, ensuring data isolation and appropriate access levels.

## System Design Choices

The application uses a PostgreSQL database with a normalized schema for all core entities including users, projects, work plans, progress trackers, incident reports, and grievances. **Supabase PostgreSQL is now the primary database** for better scalability and production readiness. The system falls back to Replit's PostgreSQL if Supabase is not configured. Configuration is managed through environment variables (SUPABASE_DATABASE_URL takes priority over DATABASE_URL).

# External Dependencies

-   **Supabase**: Primary PostgreSQL database for scalability and production use, also provides file storage.
-   **PostgreSQL**: Database layer (Supabase PostgreSQL primary, Replit PostgreSQL fallback).
-   **Passport.js**: Authentication library using LocalStrategy for email/password login with session management.
-   **Vercel**: Production hosting platform.