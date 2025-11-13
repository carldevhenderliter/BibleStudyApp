# Bible Study Application

## Overview

A Bible study web application built with React and Express that provides an immersive reading experience with advanced study tools. The application enables users to read scripture with verse-by-verse highlighting, inline note-taking, Strong's number references, and interlinear text display (Hebrew/Greek). The design emphasizes content-first principles inspired by Apple Human Interface Guidelines, prioritizing readability and minimal distractions during extended study sessions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Client-side routing via Wouter (lightweight React Router alternative)
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- Shadcn/ui component library (Radix UI primitives with Tailwind CSS)
- "New York" style variant for a clean, content-focused aesthetic
- Comprehensive design system defined in `design_guidelines.md` emphasizing:
  - Typography hierarchy optimized for long-form reading (Georgia/Charter serif for scripture)
  - Three-column layout: Navigation sidebar (20-25%) | Reading pane (50-55%) | Tools panel (20-25%)
  - Tailwind spacing primitives for consistent visual rhythm
  - Light/dark theme support via ThemeProvider context

**State Management Pattern:**
- Local component state (useState) for UI interactions (highlights, notes, toolbar visibility)
- Context API for global concerns (theme preferences)
- In-memory storage for user data (highlights, notes) - currently client-side only
- React Query for any future server data fetching/caching needs

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API routes
- Vite middleware integration for HMR during development
- HTTP server creation via Node's built-in `http` module

**Storage Layer:**
- In-memory storage implementation (`MemStorage` class) following the `IStorage` interface
- Designed for easy swap to persistent database (Drizzle ORM + PostgreSQL already configured)
- CRUD interface pattern for user management (extendable for highlights, notes, verse data)

**Database Schema (Configured, Not Yet Implemented):**
- Drizzle ORM configured with PostgreSQL dialect
- User authentication schema defined (id, username, password)
- Type definitions for Bible data structures (verses, highlights, notes) in shared schema
- Neon Database serverless driver configured for PostgreSQL connections

### Data Storage Solutions

**Current Implementation:**
- Client-side in-memory storage for highlights and notes (lost on refresh)
- Complete KJV Bible with Strong's concordance numbers loaded from `client/src/lib/bible-kjv-strongs.json`
- 71,428 verses (99.99% coverage) with integrated Strong's numbers from kaiserlik/kjv repository
  - Missing 10 books due to upstream JSON malformations: Ruth, 1 Kings, 2 Chronicles, Isaiah, Joel, Mark, Acts, 1 Corinthians, Philippians, Philemon
  - Full coverage achievable with jsonrepair library (backlog task for future enhancement)
- Word-level tokenization with Strong's tags, supporting multiple tags per word and punctuation separation
- Character-by-character JSON sanitization handles most upstream data quality issues

**Planned Architecture (Database Ready):**
- PostgreSQL via Neon serverless for production data persistence
- Drizzle ORM for type-safe database queries and migrations
- Session management via `connect-pg-simple` for PostgreSQL-backed sessions
- Schema includes:
  - Users table with authentication fields
  - Designed to extend for highlights (verse references, colors, text selections)
  - Note storage (content, timestamps, verse/word associations)
  - Bible verses with Strong's numbers and original language text

### External Dependencies

**Third-Party UI Libraries:**
- Radix UI primitives (@radix-ui/*) for accessible, unstyled component foundations
- Lucide React for consistent iconography
- Embla Carousel for any slideshow/carousel needs
- CMDK for command palette functionality
- React Hook Form with Zod resolvers for form validation

**Styling & Design:**
- Tailwind CSS v3 with custom theme extending neutral color palette
- PostCSS with Autoprefixer for browser compatibility
- Custom CSS variables for theme tokens (light/dark mode color scales)
- Typography system using web-safe fonts (Georgia, SF Pro/Inter, SF Mono/Menlo)

**Development Tools:**
- Replit-specific plugins (cartographer, dev banner, runtime error overlay)
- TSX for running TypeScript server in development
- ESBuild for production server bundling

**Key Features Enabled by Dependencies:**
- **Verse Highlighting:** Color-coded text selection stored with verse IDs
- **Note System:** Inline notes attached to verses or specific words within verses
- **Strong's Numbers (Click-Based):** 
  - Biblical reference numbers for original language study
  - Clickable inline buttons trigger definition dialog on-demand
  - Dialog displays one definition at a time with Previous/Next navigation
  - Smart fallback: Shows first available definition when clicked number lacks data
  - Toast notifications inform users of missing definitions
  - Current dataset: 8 Greek definitions (G746, G1722, G2258, G2316, G2532, G3056, G3778, G4314) covering common John 1 words
  - Hebrew definitions not yet available (planned enhancement)
- **Interlinear Display:** Hebrew/Greek text shown alongside English translations
- **Translation Switching:** Support for multiple Bible translations (KJV configured)
- **Reading Modes:** Toggle between verse-by-verse and continuous book reading
- **Responsive Design:** Mobile-optimized with sheet components for tools panel

**Authentication (Prepared, Not Active):**
- User schema with username/password fields ready for implementation
- Session management library included but not yet integrated
- Current app runs without authentication requirements