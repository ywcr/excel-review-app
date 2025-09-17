# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check TypeScript
npm run type-check

# Run strict TypeScript check
npm run strict-check
```

### Testing & Validation
```bash
# Test specific functionality with custom scripts
node scripts/testImageValidation.js
node scripts/testHashAlgorithm.js
node scripts/testHeaderRecognition.js

# Create test Excel files
node create-test-excel.js
node create-test-file.mjs

# Test dependencies
node test-dependencies.mjs
```

## Architecture Overview

This is a **Next.js 15** Excel validation application with a **pure frontend architecture** that processes Excel files entirely in the browser using Web Workers for performance and data security.

### Core Architecture Pattern

```
User Interface (src/app/page.tsx)
    ↓
Frontend Validation Hook (src/hooks/useFrontendValidation.ts)
    ↓
Web Worker (public/validation-worker.js) 🚀 Main Processing
    ↓
Unified Image Processor (src/lib/imageProcessor.ts)
```

### Key Architectural Components

#### **Frontend-First Design**
- **No server-side file uploads** - All Excel processing happens in the browser
- **Web Worker architecture** - Multi-threaded processing to prevent UI blocking
- **Real-time progress feedback** - Progress updates during validation
- **Sheet-aware filtering** - Supports WPS Excel sheet-specific image extraction

#### **Authentication System**
- JWT-based authentication with file-based user storage (`data/users.json`)
- Session keep-alive during long validation processes
- Role-based access control
- Middleware protection for authenticated routes

#### **Excel Processing Pipeline**
1. **File Upload** - `FileUpload.tsx` handles file selection and validation
2. **Task Selection** - `TaskSelector.tsx` chooses validation rules from `validationRules.ts`
3. **Sheet Detection** - `FrontendSheetSelector.tsx` for multi-sheet Excel files
4. **Web Worker Processing** - `validation-worker.js` handles Excel parsing and validation
5. **Results Display** - `ValidationResults.tsx` shows errors and validation summary

#### **Validation System**
- **Template-based validation** - Configurable rules in `src/lib/validationRules.ts`
- **Field mapping** - Excel columns mapped to standard field names
- **Business rule validation** - Frequency, duration, date range, prohibited content checks
- **Image validation** - Sharpness detection and duplicate image identification

### Directory Structure Significance

```
src/
├── app/                     # Next.js App Router
│   ├── page.tsx            # 🚀 Main UI - frontend validation flow
│   ├── login/page.tsx      # Authentication page
│   └── api/                # JWT auth, template validation endpoints
├── hooks/
│   ├── useFrontendValidation.ts  # 🚀 Core validation hook
│   ├── useAuth.ts               # Authentication state management
│   └── useSessionKeepAlive.ts   # Session management during long tasks
├── lib/
│   ├── validationRules.ts       # 🚀 Task templates and validation rules
│   ├── templateParser.ts        # Excel template parsing logic
│   ├── imageProcessor.ts        # 🚀 Unified image processing
│   └── auth.ts                  # JWT authentication utilities
├── components/
│   ├── FileUpload.tsx          # File selection and upload
│   ├── TaskSelector.tsx        # Validation task selection
│   ├── FrontendSheetSelector.tsx  # Sheet selection for multi-sheet files
│   └── ValidationResults.tsx   # Results display and error export
└── middleware.ts               # Route protection and JWT validation

public/
└── validation-worker.js        # 🚀 Web Worker - core Excel processing engine
```

### Image Processing Architecture

The application includes sophisticated image processing capabilities:

- **Multi-format support** - Handles Excel embedded images from .xlsx files
- **Sharpness detection** - Uses gradient-based algorithms to detect blurry images
- **Duplicate detection** - Perceptual hashing for finding duplicate images
- **Sheet filtering** - Correctly filters images by selected worksheet (fixes WPS Excel issues)
- **Position mapping** - Maps images back to specific Excel cell positions

### Task Template System

Validation rules are defined in `src/lib/validationRules.ts` with support for:
- **Field mapping** - Maps Chinese Excel headers to internal field names
- **Business rules** - Date validation, frequency limits, duration checks
- **Content filtering** - Prohibited terms detection
- **Cross-record validation** - Duplicate detection across multiple rows

### Performance & Optimization

- **Web Worker processing** - Prevents main thread blocking
- **Memory management** - Optimized for large Excel files
- **Progress tracking** - Real-time feedback during processing
- **Animation controls** - Performance-aware UI animations
- **Error handling** - Comprehensive error messages with user-friendly translations

## Development Guidelines

### Adding New Validation Tasks
1. Define task template in `src/lib/validationRules.ts`
2. Add field mappings for Excel column names
3. Configure validation rules (required, unique, date formats, etc.)
4. Update `TaskSelector.tsx` if UI changes needed

### Extending Image Processing
- Modify `src/lib/imageProcessor.ts` for new algorithms
- Update `public/validation-worker.js` for Web Worker integration
- Consider memory usage for large image processing operations

### Authentication Changes
- User data stored in `data/users.json`
- JWT configuration in `src/lib/auth-config.ts`
- Middleware handles route protection

### Testing Approach
- Manual testing with provided scripts in `scripts/` directory
- Browser-based testing for Web Worker functionality
- File-based testing using `create-test-excel.js` for generating test data

## Technical Notes

- **Chinese Language Support** - Interface and validation messages in Chinese
- **Excel Format Support** - Both .xlsx and .xls (with .xlsx conversion requirement for images)
- **Browser Requirements** - Modern browsers with Web Worker and Canvas API support
- **File Security** - No files uploaded to server, all processing client-side
- **Error Recovery** - Graceful fallbacks for parsing errors and unsupported formats