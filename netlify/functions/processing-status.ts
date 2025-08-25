import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessingStatusRequest {
  documentId?: string;
  documentIds?: string[];
  userId?: string;
}

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let documentId: string | undefined;
    let documentIds: string[] | undefined;
    let userId: string | undefined;

    if (event.httpMethod === 'GET') {
      // Parse query parameters
      const params = new URLSearchParams(event.queryStringParameters || '');
      documentId = params.get('documentId') || undefined;
      userId = params.get('userId') || undefined;
      
      const idsParam = params.get('documentIds');
      if (idsParam) {
        documentIds = idsParam.split(',');
      }
    } else {
      // Parse POST body
      const body: ProcessingStatusRequest = JSON.parse(event.body || '{}');
      documentId = body.documentId;
      documentIds = body.documentIds;
      userId = body.userId;
    }

    // Get single document status
    if (documentId) {
      const { data, error } = await supabase
        .rpc('get_document_processing_progress', { doc_id: documentId });

      if (error) {
        throw new Error(`Failed to get processing status: ${error.message}`);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data?.[0] || null,
        }),
      };
    }

    // Get multiple document statuses
    if (documentIds && documentIds.length > 0) {
      const { data, error } = await supabase
        .from('processing_status')
        .select('*')
        .in('document_id', documentIds);

      if (error) {
        throw new Error(`Failed to get processing statuses: ${error.message}`);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data || [],
        }),
      };
    }

    // Get all processing statuses for a user
    if (userId) {
      const { data, error } = await supabase
        .from('processing_status')
        .select(`
          *,
          documents!inner(user_id)
        `)
        .eq('documents.user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get user processing statuses: ${error.message}`);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data || [],
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Missing required parameters: documentId, documentIds, or userId',
      }),
    };

  } catch (error) {
    console.error('Processing status error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};