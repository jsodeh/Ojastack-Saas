import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FinalizeUploadRequest {
  sessionId: string;
  knowledgeBaseId: string;
}

/**
 * Reassemble chunks into final file
 */
async function reassembleFile(sessionId: string): Promise<Buffer> {
  // Get all chunks for the session, ordered by chunk_index
  const { data: chunks, error } = await supabase
    .from('upload_chunks')
    .select('chunk_index, storage_path, chunk_size')
    .eq('session_id', sessionId)
    .order('chunk_index');

  if (error) {
    throw new Error(`Failed to get chunks: ${error.message}`);
  }

  if (!chunks || chunks.length === 0) {
    throw new Error('No chunks found for session');
  }

  // Download and concatenate all chunks
  const buffers: Buffer[] = [];
  let totalSize = 0;

  for (const chunk of chunks) {
    const { data: chunkData, error: downloadError } = await supabase.storage
      .from('upload-chunks')
      .download(chunk.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download chunk ${chunk.chunk_index}: ${downloadError.message}`);
    }

    const chunkBuffer = Buffer.from(await chunkData.arrayBuffer());
    buffers.push(chunkBuffer);
    totalSize += chunkBuffer.length;
  }

  // Concatenate all chunks
  return Buffer.concat(buffers, totalSize);
}

/**
 * Store final file in knowledge base storage
 */
async function storeFinalFile(
  sessionId: string, 
  fileName: string, 
  fileBuffer: Buffer,
  knowledgeBaseId: string
): Promise<string> {
  const finalFileName = `knowledge-bases/${knowledgeBaseId}/${sessionId}-${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(finalFileName, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to store final file: ${error.message}`);
  }

  return data.path;
}

/**
 * Create document record in database
 */
async function createDocumentRecord(
  sessionId: string,
  fileName: string,
  fileSize: number,
  storagePath: string,
  knowledgeBaseId: string,
  userId: string
): Promise<string> {
  const documentId = `doc-${sessionId}`;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      knowledge_base_id: knowledgeBaseId,
      name: fileName,
      size_bytes: fileSize,
      storage_path: storagePath,
      status: 'processing',
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document record: ${error.message}`);
  }

  return data.id;
}

/**
 * Clean up chunks after successful finalization
 */
async function cleanupChunks(sessionId: string): Promise<void> {
  // Get all chunk storage paths
  const { data: chunks, error: chunksError } = await supabase
    .from('upload_chunks')
    .select('storage_path')
    .eq('session_id', sessionId);

  if (chunksError) {
    console.error('Failed to get chunks for cleanup:', chunksError);
    return;
  }

  // Delete chunks from storage
  if (chunks && chunks.length > 0) {
    const paths = chunks.map(chunk => chunk.storage_path);
    const { error: storageError } = await supabase.storage
      .from('upload-chunks')
      .remove(paths);

    if (storageError) {
      console.error('Failed to delete chunks from storage:', storageError);
    }
  }

  // Delete chunk records from database
  const { error: dbError } = await supabase
    .from('upload_chunks')
    .delete()
    .eq('session_id', sessionId);

  if (dbError) {
    console.error('Failed to delete chunk records:', dbError);
  }
}

/**
 * Update knowledge base statistics
 */
async function updateKnowledgeBaseStats(knowledgeBaseId: string): Promise<void> {
  // Get document count and total size for the knowledge base
  const { data: stats, error } = await supabase
    .from('documents')
    .select('size_bytes')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('status', 'processed');

  if (error) {
    console.error('Failed to get knowledge base stats:', error);
    return;
  }

  const documentCount = stats?.length || 0;
  const totalSize = stats?.reduce((sum, doc) => sum + (doc.size_bytes || 0), 0) || 0;

  // Update knowledge base record
  const { error: updateError } = await supabase
    .from('knowledge_bases')
    .update({
      documents_count: documentCount,
      total_size_bytes: totalSize,
      updated_at: new Date().toISOString(),
    })
    .eq('id', knowledgeBaseId);

  if (updateError) {
    console.error('Failed to update knowledge base stats:', updateError);
  }
}

/**
 * Trigger document processing using the file processing service
 */
async function triggerDocumentProcessing(
  documentId: string, 
  fileName: string, 
  fileBuffer: Buffer
): Promise<void> {
  try {
    // Initialize processing status
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'pending',
      new_progress: 0,
      new_step: 'Initializing processing',
    });

    // Start processing in background
    processFileInBackground(documentId, fileName, fileBuffer);
    
  } catch (error) {
    console.error('Failed to trigger document processing:', error);
    
    // Update status to error
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'error',
      new_progress: 0,
      error_info: {
        code: 'PROCESSING_INIT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initialize processing',
        retryable: true,
      },
    });
  }
}

/**
 * Process file in background
 */
async function processFileInBackground(
  documentId: string, 
  fileName: string, 
  fileBuffer: Buffer
): Promise<void> {
  try {
    // Step 1: Extract content
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'extracting',
      new_progress: 20,
      new_step: 'Extracting content from file',
    });

    const extractedContent = await extractFileContent(fileName, fileBuffer);

    // Step 2: Create chunks
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'chunking',
      new_progress: 40,
      new_step: 'Creating content chunks',
      chunks_total: extractedContent.chunks.length,
    });

    const chunks = await createContentChunks(extractedContent);

    // Step 3: Generate embeddings
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'embedding',
      new_progress: 60,
      new_step: 'Generating embeddings',
    });

    const chunksWithEmbeddings = await generateEmbeddings(chunks);

    // Step 4: Index content
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'indexing',
      new_progress: 80,
      new_step: 'Indexing content',
    });

    await indexContent(documentId, chunksWithEmbeddings, extractedContent.metadata);

    // Step 5: Complete
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'completed',
      new_progress: 100,
      new_step: 'Processing completed',
      chunks_processed: chunksWithEmbeddings.length,
    });

    // Update document status
    await supabase
      .from('documents')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

  } catch (error) {
    console.error('File processing failed:', error);
    
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'error',
      error_info: {
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Processing failed',
        retryable: true,
      },
    });

    // Update document status to error
    await supabase
      .from('documents')
      .update({
        status: 'error',
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);
  }
}

/**
 * Extract content from file based on type
 */
async function extractFileContent(fileName: string, fileBuffer: Buffer): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return await extractPDFContent(fileBuffer);
    case 'docx':
      return await extractDOCXContent(fileBuffer);
    case 'xlsx':
    case 'xls':
      return await extractExcelContent(fileBuffer);
    case 'txt':
    case 'md':
      return await extractTextContent(fileBuffer, fileName);
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return await extractImageContent(fileBuffer, fileName);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

/**
 * Extract content from PDF (simplified implementation)
 */
async function extractPDFContent(fileBuffer: Buffer): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  // This would use a PDF parsing library like pdf-parse
  // For now, return placeholder content
  const text = `PDF content extracted from ${fileBuffer.length} bytes`;
  
  return {
    text,
    chunks: [],
    metadata: {
      type: 'pdf',
      size: fileBuffer.length,
      pages: 1, // Would be extracted from actual PDF
    },
  };
}

/**
 * Extract content from DOCX (simplified implementation)
 */
async function extractDOCXContent(fileBuffer: Buffer): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  // This would use a library like mammoth
  const text = `DOCX content extracted from ${fileBuffer.length} bytes`;
  
  return {
    text,
    chunks: [],
    metadata: {
      type: 'docx',
      size: fileBuffer.length,
    },
  };
}

/**
 * Extract content from Excel (simplified implementation)
 */
async function extractExcelContent(fileBuffer: Buffer): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  // This would use a library like xlsx
  const text = `Excel content extracted from ${fileBuffer.length} bytes`;
  
  return {
    text,
    chunks: [],
    metadata: {
      type: 'xlsx',
      size: fileBuffer.length,
      sheets: 1, // Would be extracted from actual Excel file
    },
  };
}

/**
 * Extract content from text files
 */
async function extractTextContent(fileBuffer: Buffer, fileName: string): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  const text = fileBuffer.toString('utf-8');
  
  return {
    text,
    chunks: [],
    metadata: {
      type: 'text',
      size: fileBuffer.length,
      fileName,
    },
  };
}

/**
 * Extract content from images (OCR placeholder)
 */
async function extractImageContent(fileBuffer: Buffer, fileName: string): Promise<{
  text: string;
  chunks: any[];
  metadata: any;
}> {
  // This would use OCR like Tesseract.js
  const text = `Image content from ${fileName} (${fileBuffer.length} bytes)`;
  
  return {
    text,
    chunks: [],
    metadata: {
      type: 'image',
      size: fileBuffer.length,
      fileName,
    },
  };
}

/**
 * Create content chunks from extracted text
 */
async function createContentChunks(extractedContent: any): Promise<any[]> {
  const { text } = extractedContent;
  const chunkSize = 1000; // tokens
  const overlap = 200;
  const chunks = [];
  
  // Simple text splitting (in production, use proper tokenization)
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor(chunkSize * 0.75); // Rough token estimation
  
  for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.trim()) {
      chunks.push({
        id: `chunk-${chunks.length}`,
        content: chunkText,
        startIndex: i,
        endIndex: i + chunkWords.length,
        tokens: chunkWords.length,
        metadata: {
          type: 'text',
          confidence: 1.0,
        },
      });
    }
  }
  
  return chunks;
}

/**
 * Generate embeddings for chunks (placeholder)
 */
async function generateEmbeddings(chunks: any[]): Promise<any[]> {
  // In production, this would call OpenAI embeddings API
  return chunks.map(chunk => ({
    ...chunk,
    embedding: new Array(1536).fill(0).map(() => Math.random()), // Placeholder embedding
  }));
}

/**
 * Index content in database
 */
async function indexContent(documentId: string, chunks: any[], metadata: any): Promise<void> {
  // Store chunks
  const { error: chunksError } = await supabase
    .from('document_chunks')
    .insert(
      chunks.map(chunk => ({
        id: `${documentId}-${chunk.id}`,
        document_id: documentId,
        content: chunk.content,
        start_index: chunk.startIndex,
        end_index: chunk.endIndex,
        tokens: chunk.tokens,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
      }))
    );

  if (chunksError) {
    throw new Error(`Failed to store chunks: ${chunksError.message}`);
  }

  // Store metadata
  const { error: metadataError } = await supabase
    .from('document_metadata')
    .upsert({
      document_id: documentId,
      metadata,
      processing_stats: {
        chunks_created: chunks.length,
        processing_time: Date.now(),
      },
    });

  if (metadataError) {
    throw new Error(`Failed to store metadata: ${metadataError.message}`);
  }
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
    const { sessionId, knowledgeBaseId }: FinalizeUploadRequest = JSON.parse(event.body || '{}');

    if (!sessionId || !knowledgeBaseId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: sessionId, knowledgeBaseId',
          success: false 
        }),
      };
    }

    // Get upload session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
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

    if (session.status !== 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Upload session not completed',
          success: false 
        }),
      };
    }

    // Reassemble file from chunks
    const fileBuffer = await reassembleFile(sessionId);

    // Verify file size matches expected size
    if (fileBuffer.length !== session.file_size) {
      throw new Error(`File size mismatch: expected ${session.file_size}, got ${fileBuffer.length}`);
    }

    // Store final file
    const storagePath = await storeFinalFile(
      sessionId, 
      session.file_name, 
      fileBuffer,
      knowledgeBaseId
    );

    // Create document record
    const documentId = await createDocumentRecord(
      sessionId,
      session.file_name,
      session.file_size,
      storagePath,
      knowledgeBaseId,
      session.user_id
    );

    // Update session status
    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session status:', updateError);
    }

    // Clean up chunks (async, don't wait)
    cleanupChunks(sessionId).catch(error => {
      console.error('Chunk cleanup failed:', error);
    });

    // Update knowledge base stats (async, don't wait)
    updateKnowledgeBaseStats(knowledgeBaseId).catch(error => {
      console.error('Knowledge base stats update failed:', error);
    });

    // Trigger document processing (async, don't wait)
    triggerDocumentProcessing(documentId, session.file_name, fileBuffer).catch(error => {
      console.error('Document processing trigger failed:', error);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        documentId,
        storagePath,
        message: 'Upload finalized successfully',
      }),
    };

  } catch (error) {
    console.error('Finalize upload error:', error);
    
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