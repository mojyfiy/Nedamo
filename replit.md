# Replit MD

## Overview

This is a comprehensive accounting and financial management system (similar to Remox) built as a SaaS platform targeting small and medium businesses in the Arabic market. The system provides complete accounting functionality including transaction management, invoicing, client management, and financial reporting with full Arabic language support.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with Arabic RTL support
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API with comprehensive route structure

### Database Architecture
- **Database**: PostgreSQL with Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Multi-tenancy**: Company-based data isolation
- **Key Tables**: users, companies, transactions, invoices, clients, categories

## Key Components

### Authentication System
- Replit Auth integration with OpenID Connect
- Session-based authentication with PostgreSQL storage
- User management with profile information
- Company-based access control

### Financial Management
- **Transaction Management**: Income/expense tracking with categorization
- **Invoice System**: Full invoicing with line items, tax calculations, and status tracking
- **Client Management**: Customer and supplier database with contact information
- **Category System**: Flexible categorization for transactions and reporting

### User Interface
- **Dashboard**: Financial overview with charts and recent transactions
- **RTL Support**: Full Arabic language support with right-to-left layout
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Modern UI**: Clean, professional interface using shadcn/ui components

### Reporting System
- Financial summary cards with key metrics
- Interactive charts using Recharts library
- Recent transactions display
- Alert system for important notifications

## Data Flow

1. **Authentication Flow**: User authenticates via Replit Auth → Session created → Company access granted
2. **Transaction Flow**: User creates transaction → Validation → Database storage → Real-time UI update
3. **Invoice Flow**: User creates invoice with line items → Calculations performed → PDF generation capability → Client notification
4. **Dashboard Flow**: System aggregates financial data → Generates charts and summaries → Real-time updates via React Query

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **@radix-ui/react-***: Accessible UI components
- **recharts**: Chart and data visualization

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety
- **tailwindcss**: Utility-first CSS framework
- **@replit/vite-plugin-***: Replit-specific development tools

### Authentication Dependencies
- **openid-client**: OpenID Connect client
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Replit integration with development tools
- Environment variable management for database connections
- Concurrent client and server development

### Production Build
- Vite builds optimized React application
- esbuild bundles Express server for Node.js runtime
- Static file serving for production
- Environment-based configuration

### Database Management
- Drizzle migrations for schema changes
- Connection pooling with Neon serverless
- Automated backups and scaling
- Multi-tenant data isolation

## Changelog
- July 01, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.