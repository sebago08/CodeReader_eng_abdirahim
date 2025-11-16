# Overview

This full-stack application, "ConstructTrack," is a comprehensive road construction project management system. It enables construction professionals to manage various project types (Roads, Buildings, Infrastructure, Bridges) by tracking projects, managing specific roads and construction layers, monitoring financial progress, scheduling work plans, and recording daily activities. The platform aims to streamline project lifecycle management from planning to completion, offering real-time progress indicators and facilitating team collaboration.

# Recent Changes

**November 16, 2025 (Latest)** - **Fixed weighted progress calculation to use real-time local state values**. Bug fix: The weighted progress calculation was reading directly from server data instead of the local state values users were typing in the UI, causing the overall progress bar to only update after blur/save instead of in real-time. Updated `calculateWeightedProgress()` to use the `getValue()` helper function which checks `localValues` state first (values user is currently typing) before falling back to server data. This ensures the overall progress updates immediately as users enter quantities, rates, and quantities done, providing instant visual feedback. The fix resolves incorrect weighted progress calculations (e.g., showing 8.1% when it should be 0.39% based on financial weighting). All item field accesses (qtyInBoq, rate, qtyDone) now consistently use local state throughout the component for real-time amount and progress calculations.

**November 16, 2025** - **Implemented automatic weight calculation for BOQ Progress Tracker based on financial amounts**. Removed manual Weight column from progress tracker UI in favor of automatic calculation where weight = item.amount / total_amounts. Input fields now default to 0 instead of null (when user clears a field, it reverts to 0 rather than empty). Overall progress calculation updated to use weighted average based on financial values: Σ(item_progress × item_weight), ensuring that higher-value activities contribute more to overall progress. Edge case handling: when total amounts = 0, system falls back to equal weighting (simple average). This change aligns progress metrics with financial reality, giving proper weight to larger contract items. Calculations: Amount = qtyInBoq × rate, AmountDone = qtyDone × rate (using single rate for both), Weight auto-calculated per item, no manual input required.

**November 9, 2025** - **Replaced customizable dashboard with fixed layout for project overview pages**. Removed the per-project dashboard customization feature (Customize Dashboard button, DashboardGrid component, widget selection UI) in favor of a clean, fixed layout that displays all essential project information consistently. Fixed layout includes: Project metadata cards (ID, Location, Type, Start Date, End Date), Financial cards (Contract Amount, Amount Spent, Balance), Progress Overview card with three progress metrics (Physical, Time, Financial), and three alert tracking cards (Upcoming & Overdue Milestones, Overdue Action Points, Critical Safety Issues). Removed dashboard_layout column from projects table, deleted PATCH /api/projects/:id/dashboard-layout endpoint, and removed all widget-related components (CustomizeDashboardModal, DashboardGrid, widgetRegistry, overview-widgets directory). This simplification improves consistency and reduces maintenance overhead while ensuring all critical project information remains visible.

**November 6, 2025** - **Updated Passport Local authentication to use email-based login**. Modified authentication to use email instead of username for login while keeping username required during registration. Passport LocalStrategy configured with `usernameField: 'email'` to accept email credentials. Login form now displays email field with proper validation. Registration still requires username + email + password for account creation. Session-based cookie authentication retained with `/api/login`, `/api/register`, `/api/logout` endpoints. This provides modern authentication UX while maintaining the stable Passport Local architecture.

**November 6, 2025** - Fixed critical "Failed to save activity" bug in work plan editor. Root cause was backend validation schema missing `activityName` field and rejecting null values with `.optional()` when frontend sends null for empty fields. Updated validation to use `.nullable().optional()` for duration, startDate, and endDate. Updated IStorage interface and DatabaseStorage implementation to accept nullable values (`string | null`, `number | null`), allowing users to both update and clear activity fields. Section date calculations optimized from 3× to 1× per row using cached results. Timezone bug fixed by using `parseISO()` instead of `Date()` constructor for consistent calendar date handling.

**November 6, 2025** - Redesigned project overview page with actionable alert tracking cards. Replaced static Client/Contractor information cards with three dynamic alert tracking cards: Upcoming & Overdue Milestones (shows milestones due within 7 days or overdue), Overdue Action Points (missed deadlines with priority badges), and Critical Safety Issues (high-priority open issues). Added backend method `getProjectAlerts()` in storage.ts and new API endpoint GET /api/projects/:id/alerts to fetch project-specific alerts. Moved client/contractor information to a collapsible section at bottom of overview page for reference access while prioritizing actionable items at top. Alert cards are color-coded (red for overdue/critical, orange for upcoming) and display relevant metrics (days overdue, days until due, assignee, priority, severity).

**November 5, 2025** - Enhanced both main dashboard and individual project overview pages with improved financial visualization. Main dashboard now features 6 key metric cards (Financial Total, Amount Spent, Current Balance, Projects Behind Schedule, Critical Safety Issues, Upcoming Milestones) with backend pre-calculated road-length-weighted progress. Individual project overview pages now display 3 financial cards (Contract Amount, Amount Spent from payment certificates, Balance), a circular Financial Progress chart, and redesigned Physical/Time Progress bars. All financial metrics are consistently calculated from payment certificates, ensuring accuracy and synchronization. Fixed SQL error in getDashboardMetrics by properly querying construction layers and layer progress through road relationships. Added user authentication header to dashboard with logout functionality.

**November 4, 2025** - Completely revamped work plan management with a multi-screen workflow. Replaced single-page table editor with a list view showing all work plans for a project. Added work plan creation modal with fields for plan name, start date, and description. Created dedicated work plan editor page with inline editing capabilities and a "Save Changes" button. Updated database schema to add status (Not Started/In Progress/Completed/Blocked), ownerId, and startDate fields to work_plans table. Added new API routes: GET /api/work-plans/:id, GET /api/work-plans/:workPlanId/activities, and POST /api/work-plans/:workPlanId/activities. Work plan list displays status badges, owner avatars, last updated timestamps, and supports search/pagination. Fixed database connection issue where app was connecting to empty Supabase database instead of Replit's Neon database containing all project data.

**November 1, 2025** - Consolidated Progress Tracking into a single unified view. Merged the separate "Progress Tracking" and "BOQ Tracker" subtabs into one "Progress Tracking" subtab that displays progress bars (Physical Progress for Road projects, Activity Progress for all projects) at the top, followed by the BOQ tracker table. This simplifies the user experience by showing all progress information in one place. Removed unused activity modal and related code. The Progress tab now has 5 subtabs for Road projects (Progress Tracking, Milestones, Financial, Updates, Road linear tracker) and 4 subtabs for other project types (Progress Tracking, Milestones, Financial, Updates).

**November 1, 2025** - Fixed document generation bug where automated documents (Instruction Letter, Commencement Order, Taking Over Certificate) displayed placeholder text instead of actual project data. Updated all three document viewers to correctly use the flat project field structure (client, clientContactPerson, contractorName, etc.) instead of the previously incorrect nested object references (client.name, contractor.name, etc.).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Design

The frontend utilizes React 18, TypeScript, Wouter for routing, Radix UI/shadcn/ui for components, and Tailwind CSS for styling, focusing on a responsive, component-based design. It incorporates custom hooks for authentication and API interactions. Rich text editing capabilities, powered by TipTap, are integrated across all major text input fields for enhanced content creation.

## Technical Implementation

The frontend employs TanStack Query for server state management and React Hook Form with Zod for robust form handling and validation. The backend is built with Express.js and TypeScript, adhering to a RESTful API design. It uses Drizzle ORM for database interactions and features a layered architecture separating routing, business logic, and data access, with centralized error handling. Vite is used for frontend building.

## Feature Specifications

**Core Functionality:**
- **Financial Dashboard**: Displays comprehensive project metrics with 6 key cards (Financial Total, Amount Spent, Current Balance, Projects Behind Schedule, Critical Safety Issues, Upcoming Milestones) and Active Projects table with backend pre-calculated road-length-weighted progress for optimal performance.
- **Project Management**: CRUD operations for projects, including duplication and support for multiple project types.
- **Road & Layer Management**: Detailed tracking of road segments and construction layers with weighted progress calculation.
- **Work Plan Scheduling**: Define activities with start dates, durations, and milestones, supporting multiple work plans per project and section-based organization with inline editing.
- **BOQ Progress Tracking**: Bill of Quantities-style progress tracking derived from work plan activities, including quantity tracking, weighted ratios, and real-time progress percentages.
- **Pre-Commencement Checklist**: Tracks essential documents with status, deadlines, responsible parties, and file attachments.
- **Daily Site Logs & Action Points**: System for documenting daily activities, issues, and tracking follow-up tasks with assignees, priorities, and due dates.
- **Financial Tracking**: Management of payment certificates and financial progress.
- **Team Collaboration**: Role-based access control for project stakeholders.
- **File Storage**: Abstracted file management with support for various document types.

**Authentication & Authorization:**
The system uses Passport Local authentication with session-based cookies for secure access. Users login with email + password (registration requires username + email + password). Frontend authentication hooks manage session state via `/api/user`, `/api/login`, `/api/register`, and `/api/logout` endpoints. Backend uses Passport.js with LocalStrategy configured to authenticate via email field. Sessions are stored server-side with express-session. All users are auto-approved upon registration (no admin approval required). Role-based access control is applied to protected API endpoints via `isAuthenticated` middleware, ensuring users only access their own project data. Admin users have additional privileges for system management.

## System Design Choices

The application uses a PostgreSQL database with a normalized schema covering users (with optional auth_id column for future auth migrations), projects, personnel, equipment, payment certificates, work plans, activities, progress trackers, pre-commencement items, daily logs, action points, roads, construction layers, layer progress, and sessions. The architecture supports both development (Replit's PostgreSQL, in-memory mock storage) and production (Supabase PostgreSQL, Supabase Storage) environments, with environment-based configuration and an abstraction layer for storage services.

# External Dependencies

- **PostgreSQL**: Primary database (Replit's built-in PostgreSQL for development).
- **Supabase**: Provides PostgreSQL database (production) and file storage (production). Supabase credentials available in secrets but auth not currently used.
- **Passport.js**: Authentication library using LocalStrategy for email/password login with session management.
- **Vercel**: Production hosting platform.