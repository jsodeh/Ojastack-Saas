import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import multiparty from 'multiparty';
import crypto from 'crypto';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChunkUploadRequest {
  sessionId: string;
  chunkIndex: number;
  chunk: Buffer;
}

/**
 * Calculate MD5 checksum for chunk verification
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Store chunk in Supabase Storage
 */
async function storeChunk(sessionId: string, chunkIndex: number, chunk: Buffer): Promise<string> {
  const fileName = `chunks/${sessionId}/chunk-${chunkIndex.toString().padStart(6, '0')}`;
  
  const { data, error } = await supabase.storage
    .from('upload-chunks')
    .upload(fileName, chunk, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to store chunk: ${error.message}`);
  }

  return data.path;
}

/**
 * Record chunk upload in database
 */
async function recordChunkUpload(
  sessionId: string, 
  chunkIndex: number, 
  chunkSize: number,
  checksum: string,
  storagePath: string
): Promise<void> {
  const chunkId = `${sessionId}-chunk-${chunkIndex}`;

  const { error } = await supabase
    .from('upload_chunks')
    .upsert({
      id: chunkId,
      session_id: sessionId,
      chunk_index: chunkIndex,
      chunk_size: chunkSize,
      checksum,
      storage_path: storagePath,
    });

  if (error) {
    throw new Error(`Failed to record chunk upload: ${error.message}`);
  }
}

/**
 * Update upload session progress
 */
async function updateSessionProgress(sessionId: string, uploadedChunks: number): Promise<void> {
  // Get session info
  const { data: session, error: sessionError } = await supabase
    .from('upload_sessions')
    .select('total_chunks, uploaded_chunks')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  // Update uploaded chunks array
  const currentChunks = session.uploaded_chunks || [];
  const chunkId = `chunk-${uploadedChunks - 1}`;
  
  if (!currentChunks.includes(chunkId)) {
    currentChunks.push(chunkId);
  }

  // Determine status
  const status = currentChunks.length >= session.total_chunks ? 'completed' : 'uploading';

  const { error } = await supabase
    .from('upload_sessions')
    .update({
      uploaded_chunks: currentChunks,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update session progress: ${error.message}`);
  }
}

/**
 * Parse multipart form data
 */
function parseMultipartForm(event: any): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    
    // Convert the body to a readable stream
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const stream = new Readable();
    stream.push(bodyBuffer);
    stream.push(null);

    // Set the content type header for multiparty
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType) {
      reject(new Error('Content-Type header is required'));
      return;
    }

    form.parse(stream, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the multipart form data
    const { fields, files } = await parseMultipartForm(event);

    const sessionId = fields.sessionId?.[0];
    const chunkIndex = parseInt(fields.chunkIndex?.[0] || '0');
    const chunkFile = files.chunk?.[0];

    if (!sessionId || chunkIndex === undefined || !chunkFile) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: sessionId, chunkIndex, chunk',
          success: false 
        }),
      };
    }

    // Verify session exists and is valid
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('id, status, total_chunks, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Upload session not found',
          success: false 
        }),
      };
    }

    if (session.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Upload session already completed',
          success: false 
        }),
      };
    }

    if (chunkIndex >= session.total_chunks) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Chunk index exceeds total chunks',
          success: false 
        }),
      };
    }

    // Read chunk data
    const chunkBuffer = Buffer.from(chunkFile.buffer || chunkFile);
    const checksum = calculateChecksum(chunkBuffer);

    // Check if chunk already exists
    const { data: existingChunk } = await supabase
      .from('upload_chunks')
      .select('id, checksum')
      .eq('session_id', sessionId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (existingChunk && existingChunk.checksum === checksum) {
      // Chunk already uploaded with same checksum, skip
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Chunk already uploaded',
          chunkIndex,
          checksum,
        }),
      };
    }

    // Store chunk in storage
    const storagePath = await storeChunk(sessionId, chunkIndex, chunkBuffer);

    // Record chunk upload in database
    await recordChunkUpload(sessionId, chunkIndex, chunkBuffer.length, checksum, storagePath);

    // Update session progress
    await updateSessionProgress(sessionId, chunkIndex + 1);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        chunkIndex,
        checksum,
        storagePath,
        message: 'Chunk uploaded successfully',
      }),
    };

  } catch (error) {
    console.error('Chunk upload error:', error);
    
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