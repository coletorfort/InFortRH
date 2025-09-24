# InFort RH - Human Resources Management System

## Overview
InFort RH is a comprehensive Human Resources management application built with React, TypeScript, and Vite. It provides functionality for employee management, payroll, time-off requests, meeting scheduling, and company announcements.

## Recent Changes
- **2024-09-24**: Successfully imported and configured project for Replit environment
- Updated Vite configuration to run on port 5000 with host 0.0.0.0
- Configured deployment settings for autoscale deployment
- Set up Frontend Development Server workflow

## Project Architecture
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6.3.6
- **Styling**: TailwindCSS (via CDN)
- **State Management**: React useState hooks with local state
- **Data Storage**: Mock data in constants.ts (no backend)

## Key Features
- User authentication with role-based access (Employee/HR)
- Employee dashboard with personal information
- HR dashboard for employee management
- Time-off request system
- Meeting scheduling
- Payslip management
- Company announcements and events
- Real-time notifications

## Development Setup
- **Port**: 5000 (configured for Replit environment)
- **Host**: 0.0.0.0 (allows external access through Replit proxy)
- **Dev Command**: `npm run dev`
- **Build Command**: `npm run build`
- **Preview Command**: `npm run preview`

## User Preferences
- None specified yet

## Deployment Configuration
- **Type**: Autoscale (suitable for stateless frontend application)
- **Build**: npm run build
- **Run**: npm run preview
- **Port**: 5000 (frontend only)

## Notes
- This is a frontend-only application with mock data
- No backend server or database required
- Uses React 19 with modern import maps for external dependencies
- Configured for Replit environment with proper host settings