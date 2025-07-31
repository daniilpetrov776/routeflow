# Yandex Maps Route Planner

## Overview

This is a full-stack web application that provides route planning functionality using the Yandex Maps API. The application allows users to enter a starting point and multiple destinations, calculate optimal routes using different transport modes (walking, cycling, transit, driving), and visualize the results on an interactive map.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: Redux Toolkit for global state management
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **API Integration**: Yandex Maps Geocoding and Routing APIs

### Key Components

#### Frontend Components
1. **Route Planning Interface**
   - Address input with autocomplete suggestions
   - Transport mode selector (walking, cycling, transit, driving)
   - Route results display with multiple options
   - Interactive map container for visualization

2. **State Management**
   - Route slice for managing route planning state
   - Theme slice for dark/light/system theme management
   - Redux store configuration with proper TypeScript integration

3. **UI Components**
   - Comprehensive shadcn/ui component library
   - Custom theme provider with system preference detection
   - Toast notifications for user feedback

#### Backend Components
1. **API Routes**
   - Geocoding proxy endpoint (`/api/geocode`)
   - Route calculation endpoint (`/api/routes`)
   - Express route registration with error handling

2. **Storage Layer**
   - In-memory storage implementation (MemStorage)
   - User and route data models
   - Database schema definition with Drizzle

## Data Flow

1. **Route Planning Flow**:
   - User enters starting point and destinations
   - Frontend validates input and sends requests to backend
   - Backend proxies requests to Yandex Maps APIs
   - Route data is processed and returned to frontend
   - Results are displayed in sidebar and visualized on map

2. **Geocoding Flow**:
   - User types address in input field
   - Debounced requests sent to `/api/geocode`
   - Backend fetches suggestions from Yandex Geocoding API
   - Suggestions displayed as dropdown options

3. **Theme Management**:
   - Theme state managed in Redux
   - System theme detection and auto-switching
   - CSS custom properties updated based on theme changes

## External Dependencies

### APIs
- **Yandex Maps API**: Primary mapping service for geocoding, routing, and map visualization
- **Yandex Geocoding API**: Address search and coordinates conversion
- **Yandex Router API**: Route calculation with different transport modes

### Key Libraries
- **Frontend**: React, Redux Toolkit, TanStack Query, Tailwind CSS, Radix UI
- **Backend**: Express.js, Drizzle ORM, Zod validation
- **Database**: PostgreSQL via Neon Database
- **Development**: Vite, TypeScript, ESBuild for production builds

## Deployment Strategy

### Development
- Vite dev server with HMR for frontend development
- Express server with TypeScript compilation via tsx
- Environment variables for API keys and database connections
- Replit-specific plugins for development environment

### Production Build
- Frontend: Vite builds optimized static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Single Node.js process serves both static files and API routes
- Database migrations handled via Drizzle Kit

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `YANDEX_MAPS_API_KEY` / `VITE_YANDEX_MAPS_API_KEY`: Yandex Maps API credentials
- Session secret and other runtime configuration

### Architecture Decisions

1. **Monorepo Structure**: Frontend and backend code co-located with shared schema definitions for type safety
2. **API Proxy Pattern**: Backend proxies Yandex API requests to handle CORS and API key security
3. **In-Memory Storage**: Simple storage implementation with interface for easy database migration
4. **Component-Based UI**: Modular shadcn/ui components for consistent design system
5. **Type-Safe APIs**: Shared TypeScript types between frontend and backend via shared schema