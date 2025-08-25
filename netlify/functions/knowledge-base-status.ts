import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, knowledgeBaseIds } = event.queryStringParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }

    // Verify user authentication
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header required' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || user.id !== userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication' }),
      };
    }

    // Get knowledge base processing status
    let query = supabase
      .from('knowledge_bases')
      .select(`
        id,
        name,
        status,
        documents_count,
        total_size_bytes,
        updated_at,
        documents!inner (
          id,
          status,
          processing_status (
            status,
            progress,
            current_step,
            error_details
          )
        )
      `)
      .eq('user_id', userId);

    // Filter by specific knowledge base IDs if provided
    if (knowledgeBaseIds) {
      const kbIds = knowledgeBaseIds.split(',');
      query = query.in('id', kbIds);
    }

    const { data: knowledgeBases, error: kbError } = await query;

    if (kbError) {
      console.error('Error fetching knowledge bases:', kbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch knowledge base status' }),
      };
    }

    // Process the data to include processing statistics
    const processedData = knowledgeBases?.map(kb => {
      const documents = kb.documents || [];
      const totalDocs = documents.length;
      const processingDocs = documents.filter(doc => doc.status === 'processing').length;
      const completedDocs = documents.filter(doc => doc.status === 'processed').length;
      const failedDocs = documents.filter(doc => doc.status === 'error').length;
      const processingPercentage = totalDocs > 0 ? Math.round(((completedDocs + failedDocs) / totalDocs) * 100) : 100;

      return {
        id: kb.id,
        name: kb.name,
        status: kb.status,
        documentCount: kb.documents_count || 0,
        totalSize: kb.total_size_bytes || 0,
        lastUpdated: kb.updated_at,
        processing: {
          total: totalDocs,
          processing: processingDocs,
          completed: completedDocs,
          failed: failedDocs,
          percentage: processingPercentage,
        },
        documents: documents.map(doc => ({
          id: doc.id,
          status: doc.status,
          processingStatus: doc.processing_status?.[0] || null,
        })),
      };
    }) || [];

    // Calculate overall statistics
    const stats = {
      totalBases: processedData.length,
      totalDocuments: processedData.reduce((sum, kb) => sum + kb.processing.total, 0),
      processingQueue: processedData.reduce((sum, kb) => sum + kb.processing.processing, 0),
      completedDocuments: processedData.reduce((sum, kb) => sum + kb.processing.completed, 0),
      failedDocuments: processedData.reduce((sum, kb) => sum + kb.processing.failed, 0),
      storageUsed: processedData.reduce((sum, kb) => sum + kb.totalSize, 0),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stats,
        knowledgeBases: processedData,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Knowledge base status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};