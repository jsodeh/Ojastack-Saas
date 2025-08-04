# Knowledge Base Real Data Integration - Design Document

## Overview

This design document outlines the solution for replacing hardcoded demo data in the Knowledge Base dashboard component with real-time data from the user's actual uploaded knowledge bases and documents.

## Current Issues Analysis

### Data Display Problems
- Knowledge base statistics show fake numbers (3 bases, 490 documents, etc.)
- Knowledge base cards display demo data (Customer Support, Product Catalog, Website Content)
- Recent documents section shows fake files with fake processing status
- All data is static and doesn't reflect user's actual state

### User Experience Problems
- Misleading information prevents users from understanding their actual usage
- New users see fake data instead of helpful empty states
- No way to distinguish between real and demo content
- Processing status indicators don't reflect actual document processing

## Architecture

### Database Schema
Based on typical knowledge base systems, we expect these tables:
```sql
-- Knowledge bases table
knowledge_bases (
  id, user_id, name, description, status, 
  created_at, updated_at, document_count, total_size
)

-- Documents table  
documents (
  id, knowledge_base_id, filename, file_size, 
  status, chunk_count, created_at, updated_at
)

-- Processing queue (if exists)
document_processing_queue (
  id, document_id, status, created_at
)
```

### Component Structure
```
KnowledgeBasePage
├── Statistics Cards (needs real data)
├── Knowledge Base Grid (needs real data)
├── Recent Documents (needs real data)
└── Empty States (needs implementation)
```

## Solution Design

### 1. Data Fetching Service

Create a knowledge base service to fetch real data:

```typescript
// Knowledge base service
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'processing' | 'error';
  documentCount: number;
  totalSize: number;
  lastUpdated: string;
  createdAt: string;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  filename: string;
  fileSize: number;
  status: 'processing' | 'processed' | 'error';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseStats {
  totalBases: number;
  totalDocuments: number;
  storageUsed: number;
  processingQueue: number;
}
```

### 2. Real Data Integration

**Statistics Cards:**
- Fetch actual counts from database
- Calculate real storage usage
- Show actual processing queue length

**Knowledge Base Grid:**
- Display only user's actual knowledge bases
- Show real document counts and sizes
- Display actual processing status

**Recent Documents:**
- Show user's recently uploaded documents
- Display real file information and processing status
- Update status in real-time

### 3. Empty State Design

**No Knowledge Bases:**
```tsx
<EmptyState
  icon={Database}
  title="No knowledge bases yet"
  description="Create your first knowledge base to start organizing your AI agent's knowledge"
  actionText="Create Knowledge Base"
  actionHref="/dashboard/knowledge/create"
/>
```

**No Documents:**
```tsx
<EmptyState
  icon={FileText}
  title="No documents uploaded"
  description="Upload documents to your knowledge bases to provide context for your AI agents"
  actionText="Upload Documents"
  actionHref="/dashboard/knowledge"
/>
```

### 4. Loading States

Implement skeleton loading for:
- Statistics cards
- Knowledge base grid
- Recent documents list

### 5. Error Handling

- Network errors with retry functionality
- Processing errors with clear messaging
- File upload errors with guidance

## Implementation Strategy

### Phase 1: Data Service Creation
1. Create knowledge base data service
2. Implement database queries for statistics
3. Add error handling and loading states

### Phase 2: Statistics Integration
1. Replace hardcoded stats with real data
2. Add loading skeletons
3. Implement empty state handling

### Phase 3: Knowledge Base Grid
1. Replace demo knowledge bases with real data
2. Add empty state for no knowledge bases
3. Implement real-time status updates

### Phase 4: Recent Documents
1. Replace demo documents with real data
2. Add empty state for no documents
3. Show actual processing status

### Phase 5: Real-time Updates
1. Add polling or websocket updates for processing status
2. Implement optimistic updates for user actions
3. Add refresh functionality

## Data Flow

```
User loads Knowledge Base page
↓
Fetch user's knowledge bases from database
↓
Calculate statistics (count, storage, processing)
↓
Fetch recent documents
↓
Display real data or empty states
↓
Poll for status updates (optional)
```

## API Endpoints Needed

```typescript
// Get user's knowledge bases
GET /api/knowledge-bases?user_id={userId}

// Get knowledge base statistics
GET /api/knowledge-bases/stats?user_id={userId}

// Get recent documents
GET /api/documents/recent?user_id={userId}&limit=10

// Get processing queue status
GET /api/documents/processing-status?user_id={userId}
```

## Error Handling Strategy

### Data Fetching Errors
- Show error states with retry buttons
- Graceful fallback to empty states
- Clear error messages for users

### Processing Errors
- Display processing failures clearly
- Provide guidance for resolution
- Allow retry of failed processing

## Testing Strategy

### Data Accuracy Testing
1. Test with users who have no knowledge bases
2. Test with users who have multiple knowledge bases
3. Verify statistics calculations are correct
4. Test document processing status updates

### Empty State Testing
1. Verify empty states show for new users
2. Test transitions from empty to populated states
3. Ensure empty state actions work correctly

### Performance Testing
1. Test with large numbers of knowledge bases
2. Verify loading states work properly
3. Test real-time update performance

## Implementation Notes

- Use Supabase queries for data fetching
- Implement proper TypeScript types for all data structures
- Add proper loading states with skeletons
- Ensure all changes maintain existing design system
- Consider implementing real-time updates for processing status
- Add proper error boundaries for component failures