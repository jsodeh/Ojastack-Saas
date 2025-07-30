# Authentication & User Experience Fixes - Design Document

## Overview

This design addresses critical issues preventing smooth user onboarding and dashboard access. The solution focuses on fixing React component structure, improving data persistence, and implementing graceful error handling for optional integrations.

## Architecture

### Component Structure Fixes
- Fix DialogTrigger/Sheet component hierarchy in DashboardLayout
- Ensure all Radix UI components are properly nested within required providers
- Implement proper error boundaries for component isolation

### Data Flow Improvements
- Enhanced profile creation trigger to capture all signup metadata
- Real-time profile data loading in dashboard components
- Graceful fallbacks for missing or loading data

### Integration Management
- Optional integration pattern for n8n and other external services
- Centralized configuration management for service availability
- Fallback UI components when integrations are unavailable

## Components and Interfaces

### 1. Fixed DashboardLayout Component
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Sheet component properly wraps SheetTrigger
<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
  <SheetTrigger asChild>
    <Button>Menu</Button>
  </SheetTrigger>
  <SheetContent>
    {/* Navigation content */}
  </SheetContent>
</Sheet>
```

### 2. Enhanced Profile Creation
```sql
-- Updated trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id, 
    full_name, 
    avatar_url, 
    company,
    metadata
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Integration Service Manager
```typescript
interface IntegrationService {
  name: string;
  isAvailable: boolean;
  checkHealth(): Promise<boolean>;
  getFallbackData(): any;
}

class IntegrationManager {
  private services: Map<string, IntegrationService>;
  
  async initializeServices(): Promise<void> {
    // Check each service availability
    // Set fallback modes for unavailable services
  }
}
```

### 4. Profile Data Hook
```typescript
interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useProfile(): UseProfileReturn {
  // Fetch real profile data from Supabase
  // Handle loading and error states
  // Provide refetch capability
}
```

## Data Models

### Enhanced Profile Model
```typescript
interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  plan: string;
  usage_limit: number;
  current_usage: number;
  metadata: {
    company_size?: string;
    subscribe_newsletter?: boolean;
    signup_source?: string;
  };
}
```

### Integration Status Model
```typescript
interface IntegrationStatus {
  service: string;
  available: boolean;
  lastChecked: Date;
  error?: string;
}
```

## Error Handling

### Component Error Boundaries
- Wrap dashboard sections in error boundaries
- Provide fallback UI for component failures
- Log errors with context for debugging

### Integration Error Handling
- Graceful degradation when services are unavailable
- User-friendly messages for service outages
- Automatic retry mechanisms with exponential backoff

### Data Loading Error Handling
- Loading states for all async operations
- Retry buttons for failed requests
- Fallback to cached or default data when possible

## Testing Strategy

### Unit Tests
- Component rendering without errors
- Profile data transformation functions
- Integration service health checks
- Error boundary behavior

### Integration Tests
- Complete signup and verification flow
- Dashboard data loading with real Supabase data
- Error scenarios with unavailable services
- Mobile navigation functionality

### User Acceptance Tests
- End-to-end signup and login flow
- Dashboard accessibility after authentication
- Error recovery scenarios
- Mobile responsiveness

## Implementation Plan

### Phase 1: Critical Fixes
1. Fix DashboardLayout DialogTrigger error
2. Deploy enhanced profile creation function
3. Add graceful n8n error handling

### Phase 2: Data Integration
1. Replace mock data with real Supabase queries
2. Implement profile data loading hook
3. Add loading states and error handling

### Phase 3: Polish & Testing
1. Comprehensive error boundaries
2. Integration health monitoring
3. User experience improvements
4. Mobile optimization

## Security Considerations

- Profile data access through RLS policies
- Secure handling of user metadata
- Protection against injection in profile creation
- Proper error message sanitization

## Performance Considerations

- Lazy loading of optional integrations
- Caching of profile data
- Efficient error boundary implementation
- Minimal re-renders during data loading