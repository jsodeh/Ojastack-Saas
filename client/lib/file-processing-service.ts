import { supabase } from './supabase';

export interface FileProcessor {
  type: string;
  extensions: string[];
  mimeTypes: string[];
  icon: string;
  processor: (file: File | Buffer, fileName: string) => Promise<ProcessedContent>;
}

export interface ProcessedContent {
  text: string;
  chunks: ContentChunk[];
  metadata: FileMetadata;
  images?: ExtractedImage[];
  tables?: ExtractedTable[];
}

export interface ContentChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  tokens: number;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  page?: number;
  section?: string;
  type: 'text' | 'table' | 'image' | 'header';
  confidence: number;
  language?: string;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  pages?: number;
  language?: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
}

export interface ExtractedImage {
  id: string;
  description: string;
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
  page?: number;
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  page?: number;
  caption?: string;
}

export interface ProcessingStatus {
  documentId: string;
  fileName: string;
  status: 'pending' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  totalSteps: number;
  error?: ProcessingError;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
  processedChunks?: number;
  totalChunks?: number;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  retryCount?: number;
}

export interface ProcessingOptions {
  chunkSize?: number; // Default 1000 tokens
  chunkOverlap?: number; // Default 200 tokens
  enableImageExtraction?: boolean;
  enableTableExtraction?: boolean;
  language?: string;
  onProgress?: (status: ProcessingStatus) => void;
  onComplete?: (result: ProcessedContent) => void;
  onError?: (error: ProcessingError) => void;
}

/**
 * PDF processor using PDF.js
 */
class PDFProcessor implements FileProcessor {
  type = 'pdf';
  extensions = ['.pdf'];
  mimeTypes = ['application/pdf'];
  icon = '📄';

  async processor(file: File | Buffer, fileName: string): Promise<ProcessedContent> {
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file.buffer;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const images: ExtractedImage[] = [];
      const tables: ExtractedTable[] = [];
      const metadata: FileMetadata = {
        fileName,
        fileSize: arrayBuffer.byteLength,
        mimeType: 'application/pdf',
        pages: pdf.numPages,
      };

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let pageText = '';
        textContent.items.forEach((item: any) => {
          if (item.str) {
            pageText += item.str + ' ';
          }
        });

        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;

        // Extract images if enabled
        const operatorList = await page.getOperatorList();
        // Process images from operator list (simplified)
        // In a real implementation, you'd extract actual images
      }

      // Create chunks
      const chunks = this.createChunks(fullText, fileName);

      return {
        text: fullText,
        chunks,
        metadata,
        images,
        tables,
      };
    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChunks(text: string, fileName: string): ContentChunk[] {
    const chunkSize = 1000; // tokens
    const overlap = 200;
    const chunks: ContentChunk[] = [];
    
    // Simple text splitting (in production, use proper tokenization)
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize * 0.75); // Rough token estimation
    
    for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim()) {
        chunks.push({
          id: `${fileName}-chunk-${chunks.length}`,
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
}

/**
 * DOCX processor using mammoth.js
 */
class DOCXProcessor implements FileProcessor {
  type = 'docx';
  extensions = ['.docx'];
  mimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  icon = '📝';

  async processor(file: File | Buffer, fileName: string): Promise<ProcessedContent> {
    try {
      // Import mammoth dynamically
      const mammoth = await import('mammoth');
      
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file.buffer;
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      const metadata: FileMetadata = {
        fileName,
        fileSize: arrayBuffer.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      const chunks = this.createChunks(result.value, fileName);

      return {
        text: result.value,
        chunks,
        metadata,
      };
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChunks(text: string, fileName: string): ContentChunk[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: ContentChunk[] = [];
    
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize * 0.75);
    
    for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim()) {
        chunks.push({
          id: `${fileName}-chunk-${chunks.length}`,
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
}

/**
 * Excel processor using xlsx
 */
class XLSXProcessor implements FileProcessor {
  type = 'xlsx';
  extensions = ['.xlsx', '.xls'];
  mimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  icon = '📊';

  async processor(file: File | Buffer, fileName: string): Promise<ProcessedContent> {
    try {
      // Import xlsx dynamically
      const XLSX = await import('xlsx');
      
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file.buffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let fullText = '';
      const tables: ExtractedTable[] = [];
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] || [];
          const rows = jsonData.slice(1);
          
          // Add to tables
          tables.push({
            id: `${fileName}-table-${index}`,
            headers,
            rows,
            caption: `Sheet: ${sheetName}`,
          });
          
          // Convert to text
          fullText += `\n--- Sheet: ${sheetName} ---\n`;
          fullText += headers.join('\t') + '\n';
          rows.forEach(row => {
            fullText += row.join('\t') + '\n';
          });
        }
      });

      const metadata: FileMetadata = {
        fileName,
        fileSize: arrayBuffer.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const chunks = this.createChunks(fullText, fileName);

      return {
        text: fullText,
        chunks,
        metadata,
        tables,
      };
    } catch (error) {
      throw new Error(`XLSX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChunks(text: string, fileName: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // Group lines into chunks of reasonable size
    const linesPerChunk = 50;
    for (let i = 0; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      const chunkText = chunkLines.join('\n');
      
      if (chunkText.trim()) {
        chunks.push({
          id: `${fileName}-chunk-${chunks.length}`,
          content: chunkText,
          startIndex: i,
          endIndex: i + chunkLines.length,
          tokens: chunkText.split(/\s+/).length,
          metadata: {
            type: 'table',
            confidence: 1.0,
          },
        });
      }
    }

    return chunks;
  }
}

/**
 * Image processor using OCR
 */
class ImageProcessor implements FileProcessor {
  type = 'image';
  extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  icon = '🖼️';

  async processor(file: File | Buffer, fileName: string): Promise<ProcessedContent> {
    try {
      // For now, we'll use a simple image description
      // In production, you'd use OCR (Tesseract.js) or vision APIs
      
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file.buffer;
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Placeholder for OCR text extraction
      const extractedText = `Image: ${fileName}\nThis image contains visual content that may include text, diagrams, or other visual elements.`;
      
      const metadata: FileMetadata = {
        fileName,
        fileSize: arrayBuffer.byteLength,
        mimeType: file instanceof File ? file.type : 'image/jpeg',
      };

      const images: ExtractedImage[] = [{
        id: `${fileName}-image-0`,
        description: 'Main image content',
        base64,
        mimeType: metadata.mimeType,
      }];

      const chunks = this.createChunks(extractedText, fileName);

      return {
        text: extractedText,
        chunks,
        metadata,
        images,
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChunks(text: string, fileName: string): ContentChunk[] {
    return [{
      id: `${fileName}-chunk-0`,
      content: text,
      startIndex: 0,
      endIndex: text.length,
      tokens: text.split(/\s+/).length,
      metadata: {
        type: 'image',
        confidence: 0.8,
      },
    }];
  }
}

/**
 * Text processor for plain text files
 */
class TextProcessor implements FileProcessor {
  type = 'text';
  extensions = ['.txt', '.md', '.csv'];
  mimeTypes = ['text/plain', 'text/markdown', 'text/csv'];
  icon = '📄';

  async processor(file: File | Buffer, fileName: string): Promise<ProcessedContent> {
    try {
      const text = file instanceof File 
        ? await file.text() 
        : file.toString('utf-8');
      
      const metadata: FileMetadata = {
        fileName,
        fileSize: file instanceof File ? file.size : file.length,
        mimeType: file instanceof File ? file.type : 'text/plain',
      };

      const chunks = this.createChunks(text, fileName);

      return {
        text,
        chunks,
        metadata,
      };
    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChunks(text: string, fileName: string): ContentChunk[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: ContentChunk[] = [];
    
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize * 0.75);
    
    for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim()) {
        chunks.push({
          id: `${fileName}-chunk-${chunks.length}`,
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
}

/**
 * File Processing Service
 */
export class FileProcessingService {
  private static instance: FileProcessingService;
  private processors: Map<string, FileProcessor> = new Map();
  private processingQueue: Map<string, ProcessingStatus> = new Map();
  private eventListeners: Map<string, ((status: ProcessingStatus) => void)[]> = new Map();

  private constructor() {
    this.registerProcessors();
  }

  public static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  private registerProcessors(): void {
    const processors = [
      new PDFProcessor(),
      new DOCXProcessor(),
      new XLSXProcessor(),
      new ImageProcessor(),
      new TextProcessor(),
    ];

    processors.forEach(processor => {
      processor.extensions.forEach(ext => {
        this.processors.set(ext.toLowerCase(), processor);
      });
      processor.mimeTypes.forEach(mimeType => {
        this.processors.set(mimeType.toLowerCase(), processor);
      });
    });
  }

  /**
   * Get supported file types
   */
  public getSupportedFileTypes(): FileProcessor[] {
    const uniqueProcessors = new Map<string, FileProcessor>();
    this.processors.forEach(processor => {
      uniqueProcessors.set(processor.type, processor);
    });
    return Array.from(uniqueProcessors.values());
  }

  /**
   * Check if file type is supported
   */
  public isFileTypeSupported(fileName: string, mimeType?: string): boolean {
    const extension = this.getFileExtension(fileName);
    const hasExtension = this.processors.has(extension);
    const hasMimeType = mimeType && this.processors.has(mimeType.toLowerCase());
    return hasExtension || Boolean(hasMimeType);
  }

  /**
   * Get processor for file
   */
  public getProcessorForFile(fileName: string, mimeType?: string): FileProcessor | null {
    const extension = this.getFileExtension(fileName);
    let processor = this.processors.get(extension);
    
    if (!processor && mimeType) {
      processor = this.processors.get(mimeType.toLowerCase());
    }
    
    return processor || null;
  }

  /**
   * Process a file
   */
  public async processFile(
    documentId: string,
    file: File | Buffer,
    fileName: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const processor = this.getProcessorForFile(fileName, file instanceof File ? file.type : undefined);
    
    if (!processor) {
      throw new Error(`Unsupported file type: ${fileName}`);
    }

    // Initialize processing status
    const status: ProcessingStatus = {
      documentId,
      fileName,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing',
      totalSteps: 5,
      startedAt: new Date(),
    };

    this.processingQueue.set(documentId, status);
    this.notifyListeners(documentId, status);

    try {
      // Step 1: Extract content
      this.updateStatus(documentId, {
        status: 'extracting',
        progress: 20,
        currentStep: 'Extracting content',
      });

      const result = await processor.processor(file, fileName);

      // Step 2: Create chunks
      this.updateStatus(documentId, {
        status: 'chunking',
        progress: 40,
        currentStep: 'Creating chunks',
        totalChunks: result.chunks.length,
      });

      // Step 3: Generate embeddings (placeholder)
      this.updateStatus(documentId, {
        status: 'embedding',
        progress: 60,
        currentStep: 'Generating embeddings',
      });

      await this.generateEmbeddings(result.chunks);

      // Step 4: Index content
      this.updateStatus(documentId, {
        status: 'indexing',
        progress: 80,
        currentStep: 'Indexing content',
      });

      await this.indexContent(documentId, result);

      // Step 5: Complete
      this.updateStatus(documentId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Completed',
        completedAt: new Date(),
      });

      options.onProgress?.(this.processingQueue.get(documentId)!);
      options.onComplete?.(result);
      return result;

    } catch (error) {
      const processingError: ProcessingError = {
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Processing failed',
        retryable: true,
      };

      this.updateStatus(documentId, {
        status: 'error',
        error: processingError,
      });

      options.onError?.(processingError);
      throw error;
    }
  }

  /**
   * Get processing status
   */
  public getProcessingStatus(documentId: string): ProcessingStatus | null {
    return this.processingQueue.get(documentId) || null;
  }

  /**
   * Subscribe to processing updates
   */
  public onProcessingUpdate(documentId: string, callback: (status: ProcessingStatus) => void): () => void {
    if (!this.eventListeners.has(documentId)) {
      this.eventListeners.set(documentId, []);
    }
    
    this.eventListeners.get(documentId)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(documentId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private updateStatus(documentId: string, updates: Partial<ProcessingStatus>): void {
    const current = this.processingQueue.get(documentId);
    if (current) {
      const updated = { ...current, ...updates };
      this.processingQueue.set(documentId, updated);
      this.notifyListeners(documentId, updated);
    }
  }

  private notifyListeners(documentId: string, status: ProcessingStatus): void {
    const listeners = this.eventListeners.get(documentId);
    if (listeners) {
      listeners.forEach(callback => callback(status));
    }
  }

  private async generateEmbeddings(chunks: ContentChunk[]): Promise<void> {
    // Placeholder for embedding generation
    // In production, you'd call OpenAI embeddings API or similar
    for (let i = 0; i < chunks.length; i++) {
      // Simulate embedding generation
      chunks[i].embedding = new Array(1536).fill(0).map(() => Math.random());
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async indexContent(documentId: string, content: ProcessedContent): Promise<void> {
    // Store processed content in database
    const { error } = await supabase
      .from('document_chunks')
      .insert(
        content.chunks.map(chunk => ({
          id: chunk.id,
          document_id: documentId,
          content: chunk.content,
          start_index: chunk.startIndex,
          end_index: chunk.endIndex,
          tokens: chunk.tokens,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
          created_at: new Date().toISOString(),
        }))
      );

    if (error) {
      throw new Error(`Failed to index content: ${error.message}`);
    }

    // Store metadata
    const { error: metadataError } = await supabase
      .from('document_metadata')
      .upsert({
        document_id: documentId,
        metadata: content.metadata,
        images: content.images || [],
        tables: content.tables || [],
        updated_at: new Date().toISOString(),
      });

    if (metadataError) {
      throw new Error(`Failed to store metadata: ${metadataError.message}`);
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > -1 ? fileName.substring(lastDot).toLowerCase() : '';
  }
}

// Export singleton instance
export const fileProcessingService = FileProcessingService.getInstance();

// Utility functions
export function getFileTypeIcon(fileName: string, mimeType?: string): string {
  const processor = fileProcessingService.getProcessorForFile(fileName, mimeType);
  return processor?.icon || '📄';
}

export function formatProcessingTime(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const diffMs = end.getTime() - startTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s`;
  return `${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m`;
}

export function estimateProcessingTime(fileSize: number, fileType: string): number {
  // Rough estimates in seconds based on file type and size
  const baseTimes = {
    pdf: 0.5, // seconds per MB
    docx: 0.3,
    xlsx: 0.4,
    image: 2.0, // OCR is slower
    text: 0.1,
  };
  
  const fileSizeMB = fileSize / (1024 * 1024);
  const baseTime = baseTimes[fileType as keyof typeof baseTimes] || 0.5;
  
  return Math.max(5, Math.floor(fileSizeMB * baseTime));
}