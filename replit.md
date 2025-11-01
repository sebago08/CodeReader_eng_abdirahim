# Overview

This full-stack application, "ConstructTrack," is a comprehensive road construction project management system. It enables construction professionals to manage various project types (Roads, Buildings, Infrastructure, Bridges) by tracking projects, managing specific roads and construction layers, monitoring financial progress, scheduling work plans, and recording daily activities. The platform aims to streamline project lifecycle management from planning to completion, offering real-time progress indicators and facilitating team collaboration.

# Recent Changes

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
- **Actionable Dashboard**: Prioritizes critical metrics requiring immediate attention with 6 key cards (Action Points Due Soon, Projects Behind Schedule, Critical Safety Issues, Overdue Pre-Commencement Docs, Pending Payment Certificates, Upcoming Milestones) and Active Projects table with real-time progress calculations.
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
The system uses Passport Local Authentication with session-based cookies for secure access. It supports email/password authentication through Passport's local strategy. All users are auto-approved upon registration (no admin approval required). Role-based access control is applied to protected API endpoints, ensuring users only access their own project data. Admin users have additional privileges for system management.

## System Design Choices

The application uses a PostgreSQL database with a normalized schema covering users, projects, personnel, equipment, payment certificates, work plans, activities, progress trackers, pre-commencement items, daily logs, action points, roads, construction layers, layer progress, and sessions. The architecture supports both development (Replit's PostgreSQL, in-memory mock storage) and production (Supabase PostgreSQL, Supabase Storage) environments, with environment-based configuration and an abstraction layer for storage services.

# External Dependencies

- **PostgreSQL**: Primary database (Replit's built-in PostgreSQL for development).
- **Passport.js**: Authentication library for session-based email/password authentication.
- **Express Session**: Session management for persistent user authentication.
- **Vercel**: Production hosting platform (requires Supabase PostgreSQL for production database).