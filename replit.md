# Overview

"ConstructTrack" is a comprehensive full-stack road construction project management system. It enables construction professionals to manage diverse project types (Roads, Buildings, Infrastructure, Bridges) by providing tools for tracking projects, managing specific roads and construction layers, monitoring financial progress, scheduling work plans, and recording daily activities. The platform aims to streamline the project lifecycle from planning to completion, offering real-time progress indicators and facilitating team collaboration. Its ambition is to provide a robust solution for efficient and transparent construction project management, offering significant market potential in the construction tech sector.

# Recent Changes

**December 4, 2025 (Latest)** - **Added World Bank-compliant Grievance Redress Mechanism (GRM)**. Implemented comprehensive grievance tracking system for community complaints in compliance with World Bank Environmental & Social Framework requirements. Key components:
- Created `grievances` database table with 25+ fields supporting multi-channel intake, complainant management, and full resolution workflow
- Complainant info: name, contact details, gender, anonymous complaint support
- Intake channels: walk-in, phone, email, letter, community meeting, suggestion box
- Categories: compensation, resettlement, employment, environment, safety, noise/dust, property damage, access
- Status workflow: Registered → Acknowledged → Under Investigation → Resolved/Escalated/Appealed → Closed
- Priority levels: Low, Medium, High, Urgent
- Resolution tracking: target resolution date, resolution description, satisfaction level (satisfied/partially satisfied/not satisfied), feedback
- Escalation support: escalation tracking with reason and outcome
- Appeal mechanism: appeal date and outcome tracking
- Full CRUD API endpoints with proper project-level authorization
- Built GrievancesTab component with category/status filtering, list view, and comprehensive form
- Dashboard integration showing "Open Grievances" summary card with breakdown (Registered/Investigating/Escalated)
- Active Projects table now includes Grievances column showing open count per project

**December 4, 2025** - **Added World Bank-compliant Incident Reporting System**. Implemented comprehensive incident reporting feature for international infrastructure projects. Key components:
- Created `incident_reports` database table with 15+ fields matching World Bank ESF compliance requirements
- Added full CRUD API endpoints with proper authorization checks (GET/PATCH/DELETE verify project access)
- Built IncidentsTab component with classification filtering (Indicative/Serious/Severe), status workflow (Draft/Submitted/Under Review/Closed)
- Comprehensive form with all required fields: location, people involved (project engineer, safeguards officer), incident details, discovery information, containment status, harm assessment, measures implemented, agency notifications
- Detail view dialog for viewing complete incident reports
- Dashboard integration showing "Open Incident Reports" summary card with breakdown by classification (Severe/Serious/Indicative)
- Security: All incident report endpoints enforce project-level authorization

**November 16, 2025** - **Fixed critical backend bug preventing rate values from being saved**. Root cause: The PATCH /api/progress-tracker-items/:id endpoint validation schema was missing the `rate` field, causing all rate updates to be silently discarded (requests returned 200 but without saving rates). Added `rate` field to validation schema and implemented proper type conversion from numbers (frontend) to strings (database decimal type). This bug completely prevented users from saving rates in BOQ tracker items, making financial calculations impossible. Now rates persist correctly after clicking "Save Changes".

**November 16, 2025** - **Added explicit "Save Changes" button to BOQ Progress Tracker to prevent data loss**. Fixed critical UX issue where users would type rates and quantities but lose them on page refresh because auto-save-on-blur didn't trigger before refresh. Implemented manual save workflow: removed auto-save on blur from all input fields (qtyInBoq, rate, qtyDone), added amber warning banner that appears when there are unsaved changes showing count of edited items, added "Save Changes" button that batch-saves all pending edits using Promise.all with proper async/await handling. Changes only persist after clicking Save button. Added confirmation dialog when switching trackers with unsaved changes to prevent accidental data loss. Error handling ensures failed saves keep local edits intact so users can retry without retyping. This gives users explicit control over when changes are saved and eliminates the frustration of lost data due to premature page refreshes.

**November 16, 2025** - **Implemented two-level progress tracking system with financial weighting**. Added project-wide overall Activity Progress bar (top) that calculates weighted average across all BOQ trackers based on their total BOQ amounts, ensuring larger-value trackers properly influence overall project metrics. Restored per-tracker progress bar (above items table) showing weighted progress for the currently selected tracker only. Backend updated: GET /api/projects/:projectId/progress-trackers now accepts optional `includeItems=true` query parameter to fetch all trackers with their items in one call for efficient overall progress calculation. Frontend implementation: `calculateOverallActivityProgress()` function loops through all trackers, calculates each tracker's total BOQ amount and weighted progress, then computes the weighted average where tracker_weight = tracker_amount / total_project_amount. Cache invalidation ensures both progress bars update in real-time: all tracker mutations (create, update, delete) now invalidate both the single-tracker query and the all-trackers-with-items query. This two-level system gives users both macro (overall project) and micro (individual tracker) visibility into progress.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Design

The frontend leverages React 18, TypeScript, Wouter for routing, Radix UI/shadcn/ui for components, and Tailwind CSS for styling, emphasizing a responsive, component-based design. It incorporates custom hooks for authentication and API interactions. Rich text editing capabilities, powered by TipTap, are integrated into key text input fields.

## Technical Implementation

The frontend uses TanStack Query for server state management and React Hook Form with Zod for form handling and validation. The backend is built with Express.js and TypeScript, following a RESTful API design. It utilizes Drizzle ORM for database interactions and employs a layered architecture separating routing, business logic, and data access, with centralized error handling. Vite is used for frontend building.

## Feature Specifications

**Core Functionality:**
- **Financial Dashboard**: Displays comprehensive project metrics including Financial Total, Amount Spent, Current Balance, Projects Behind Schedule, Critical Safety Issues, Open Incident Reports, Open Grievances, and Upcoming Milestones, with road-length-weighted progress.
- **Project Management**: CRUD operations for projects, including duplication and support for multiple project types.
- **Road & Layer Management**: Detailed tracking of road segments and construction layers with weighted progress calculations.
- **Work Plan Scheduling**: Define activities with start dates, durations, and milestones, supporting multiple work plans per project and section-based organization with inline editing.
- **BOQ Progress Tracking**: Bill of Quantities-style progress tracking derived from work plan activities, including quantity tracking, weighted ratios, and real-time financial-weighted progress percentages.
- **Pre-Commencement Checklist**: Tracks essential documents with status, deadlines, responsible parties, and file attachments.
- **Daily Site Logs & Action Points**: System for documenting daily activities, issues, and tracking follow-up tasks with assignees, priorities, and due dates.
- **World Bank Incident Reporting**: Comprehensive incident reporting system compliant with World Bank ESF requirements. Features 3-tier classification (Indicative/Serious/Severe), status workflow (Draft/Submitted/Under Review/Closed), and 15+ required fields including project personnel, incident details, discovery information, harm assessment, and agency notifications.
- **World Bank Grievance Redress Mechanism (GRM)**: Comprehensive grievance tracking system compliant with World Bank ESF requirements. Features multi-channel intake (walk-in, phone, email, letter, community meeting, suggestion box), complainant management with anonymous complaint support, 9 grievance categories (compensation, resettlement, employment, environment, safety, noise/dust, property damage, access, other), status workflow (Registered → Acknowledged → Under Investigation → Resolved/Escalated → Closed), priority levels, satisfaction tracking, and escalation/appeal mechanisms.
- **Financial Tracking**: Management of payment certificates and financial progress.
- **Team Collaboration**: Role-based access control for project stakeholders.
- **File Storage**: Abstracted file management with support for various document types.

**Authentication & Authorization:**
The system uses Passport Local authentication with session-based cookies. Users log in with email and password (registration requires username, email, and password). Frontend authentication hooks manage session state via dedicated API endpoints. Backend uses Passport.js with LocalStrategy configured for email authentication. Sessions are stored server-side with express-session. All users are auto-approved upon registration. Role-based access control is applied to protected API endpoints via `isAuthenticated` middleware, ensuring data isolation and appropriate access levels, with additional privileges for admin users.

## System Design Choices

The application uses a PostgreSQL database with a normalized schema covering users, projects, personnel, equipment, payment certificates, work plans, activities, progress trackers, pre-commencement items, daily logs, action points, roads, construction layers, layer progress, incident reports (World Bank compliant), grievances (World Bank GRM compliant), and sessions. The architecture supports both development (Replit's PostgreSQL, in-memory mock storage) and production (Supabase PostgreSQL, Supabase Storage) environments, with environment-based configuration and an abstraction layer for storage services.

# External Dependencies

-   **PostgreSQL**: Primary database (Replit's built-in PostgreSQL for development, Supabase PostgreSQL for production).
-   **Supabase**: Provides PostgreSQL database (production) and file storage (production).
-   **Passport.js**: Authentication library using LocalStrategy for email/password login with session management.
-   **Vercel**: Production hosting platform.