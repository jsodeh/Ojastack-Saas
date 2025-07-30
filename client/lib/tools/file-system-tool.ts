import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from '../tool-system';

export interface FileSystemResult {
  operation: string;
  result: any;
  path?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * File System Tool
 * Provides safe file system operations for agents
 */
export class FileSystemTool {
  private allowedExtensions = [
    '.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml',
    '.log', '.config', '.ini', '.env', '.gitignore'
  ];

  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxFiles = 100;

  /**
   * Execute file system operation
   */
  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const { 
      operation = 'read_file',
      path,
      content,
      encoding = 'utf8',
      create_directories = false,
      pattern,
      recursive = false
    } = parameters;

    try {
      // Security validation
      this.validatePath(path);
      
      let result: FileSystemResult;

      switch (operation) {
        case 'read_file':
          result = await this.readFile(path, encoding);
          break;
        case 'write_file':
          result = await this.writeFile(path, content, encoding, create_directories);
          break;
        case 'append_file':
          result = await this.appendFile(path, content, encoding);
          break;
        case 'delete_file':
          result = await this.deleteFile(path);
          break;
        case 'list_directory':
          result = await this.listDirectory(path, recursive);
          break;
        case 'create_directory':
          result = await this.createDirectory(path);
          break;
        case 'file_info':
          result = await this.getFileInfo(path);
          break;
        case 'search_files':
          result = await this.searchFiles(path, pattern, recursive);
          break;
        case 'copy_file':
          result = await this.copyFile(path, parameters.destination);
          break;
        case 'move_file':
          result = await this.moveFile(path, parameters.destination);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        success: true,
        result,
        execution_time: Date.now() - startTime,
        metadata: {
          operation,
          path_processed: path,
          encoding_used: encoding,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `File system operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        execution_time: Date.now() - startTime,
      };
    }
  }

  /**
   * Read file content
   */
  private async readFile(path: string, encoding: string): Promise<FileSystemResult> {
    try {
      // In a real implementation, you'd use Node.js fs module or browser File API
      // This is a mock implementation for demonstration
      const mockContent = `Mock file content for ${path}`;
      
      const result = {
        content: mockContent,
        size: mockContent.length,
        encoding,
        last_modified: new Date().toISOString(),
        readable: true,
      };

      return {
        operation: 'read_file',
        result,
        path,
        timestamp: new Date().toISOString(),
        metadata: {
          file_extension: this.getFileExtension(path),
          is_text_file: this.isTextFile(path),
        },
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write file content
   */
  private async writeFile(
    path: string, 
    content: string, 
    encoding: string, 
    createDirectories: boolean
  ): Promise<FileSystemResult> {
    try {
      // Validate content size
      if (content.length > this.maxFileSize) {
        throw new Error(`File content exceeds maximum size of ${this.maxFileSize} bytes`);
      }

      // Mock implementation
      const result = {
        bytes_written: content.length,
        encoding,
        created: true,
        directories_created: createDirectories,
        path: path,
      };

      return {
        operation: 'write_file',
        result,
        path,
        timestamp: new Date().toISOString(),
        metadata: {
          content_length: content.length,
          file_extension: this.getFileExtension(path),
        },
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Append to file
   */
  private async appendFile(path: string, content: string, encoding: string): Promise<FileSystemResult> {
    try {
      const result = {
        bytes_appended: content.length,
        encoding,
        path: path,
      };

      return {
        operation: 'append_file',
        result,
        path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to append to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file
   */
  private async deleteFile(path: string): Promise<FileSystemResult> {
    try {
      const result = {
        deleted: true,
        path: path,
      };

      return {
        operation: 'delete_file',
        result,
        path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List directory contents
   */
  private async listDirectory(path: string, recursive: boolean): Promise<FileSystemResult> {
    try {
      // Mock directory listing
      const mockFiles = [
        {
          name: 'file1.txt',
          type: 'file',
          size: 1024,
          modified: new Date().toISOString(),
          path: `${path}/file1.txt`,
        },
        {
          name: 'subdirectory',
          type: 'directory',
          size: 0,
          modified: new Date().toISOString(),
          path: `${path}/subdirectory`,
        },
        {
          name: 'data.json',
          type: 'file',
          size: 2048,
          modified: new Date().toISOString(),
          path: `${path}/data.json`,
        },
      ];

      const result = {
        files: mockFiles,
        total_files: mockFiles.filter(f => f.type === 'file').length,
        total_directories: mockFiles.filter(f => f.type === 'directory').length,
        recursive,
        path,
      };

      return {
        operation: 'list_directory',
        result,
        path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create directory
   */
  private async createDirectory(path: string): Promise<FileSystemResult> {
    try {
      const result = {
        created: true,
        path: path,
        recursive: true,
      };

      return {
        operation: 'create_directory',
        result,
        path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file information
   */
  private async getFileInfo(path: string): Promise<FileSystemResult> {
    try {
      const result = {
        path,
        name: path.split('/').pop() || path,
        extension: this.getFileExtension(path),
        size: 1024,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        accessed: new Date().toISOString(),
        is_file: !path.endsWith('/'),
        is_directory: path.endsWith('/'),
        is_readable: true,
        is_writable: true,
        permissions: '644',
      };

      return {
        operation: 'file_info',
        result,
        path,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for files
   */
  private async searchFiles(basePath: string, pattern: string, recursive: boolean): Promise<FileSystemResult> {
    try {
      // Mock search results
      const mockResults = [
        {
          path: `${basePath}/matching-file.txt`,
          name: 'matching-file.txt',
          size: 512,
          modified: new Date().toISOString(),
          match_type: 'filename',
        },
        {
          path: `${basePath}/data/another-match.json`,
          name: 'another-match.json',
          size: 1024,
          modified: new Date().toISOString(),
          match_type: 'filename',
        },
      ];

      const result = {
        pattern,
        base_path: basePath,
        recursive,
        matches: mockResults,
        total_matches: mockResults.length,
        search_time: '0.05s',
      };

      return {
        operation: 'search_files',
        result,
        path: basePath,
        timestamp: new Date().toISOString(),
        metadata: {
          pattern_used: pattern,
          recursive_search: recursive,
        },
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy file
   */
  private async copyFile(sourcePath: string, destinationPath: string): Promise<FileSystemResult> {
    try {
      this.validatePath(destinationPath);

      const result = {
        source: sourcePath,
        destination: destinationPath,
        copied: true,
        size: 1024,
      };

      return {
        operation: 'copy_file',
        result,
        path: sourcePath,
        timestamp: new Date().toISOString(),
        metadata: {
          destination_path: destinationPath,
        },
      };
    } catch (error) {
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Move file
   */
  private async moveFile(sourcePath: string, destinationPath: string): Promise<FileSystemResult> {
    try {
      this.validatePath(destinationPath);

      const result = {
        source: sourcePath,
        destination: destinationPath,
        moved: true,
      };

      return {
        operation: 'move_file',
        result,
        path: sourcePath,
        timestamp: new Date().toISOString(),
        metadata: {
          destination_path: destinationPath,
        },
      };
    } catch (error) {
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods

  /**
   * Validate file path for security
   */
  private validatePath(path: string): void {
    if (!path) {
      throw new Error('Path is required');
    }

    // Prevent path traversal attacks
    if (path.includes('..') || path.includes('~')) {
      throw new Error('Path traversal not allowed');
    }

    // Prevent access to system directories
    const forbiddenPaths = ['/etc', '/sys', '/proc', '/dev', '/root'];
    if (forbiddenPaths.some(forbidden => path.startsWith(forbidden))) {
      throw new Error('Access to system directories not allowed');
    }

    // Check file extension if it's a file
    if (path.includes('.') && !path.endsWith('/')) {
      const extension = this.getFileExtension(path);
      if (!this.allowedExtensions.includes(extension)) {
        throw new Error(`File extension ${extension} not allowed`);
      }
    }
  }

  /**
   * Get file extension
   */
  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    return lastDot > 0 ? path.substring(lastDot) : '';
  }

  /**
   * Check if file is a text file
   */
  private isTextFile(path: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.csv', '.log'];
    const extension = this.getFileExtension(path);
    return textExtensions.includes(extension);
  }

  /**
   * Get tool definition
   */
  static getDefinition(): ToolDefinition {
    return {
      id: 'file_system',
      name: 'File System Operations',
      description: 'Safe file system operations for reading, writing, and managing files',
      category: 'utility',
      provider: 'built-in',
      version: '1.0.0',
      parameters: [
        {
          name: 'operation',
          type: 'string',
          description: 'Type of file system operation',
          required: false,
          default: 'read_file',
          enum: [
            'read_file',
            'write_file',
            'append_file',
            'delete_file',
            'list_directory',
            'create_directory',
            'file_info',
            'search_files',
            'copy_file',
            'move_file',
          ],
        },
        {
          name: 'path',
          type: 'string',
          description: 'File or directory path',
          required: true,
        },
        {
          name: 'content',
          type: 'string',
          description: 'Content to write or append (for write/append operations)',
          required: false,
        },
        {
          name: 'encoding',
          type: 'string',
          description: 'File encoding',
          required: false,
          default: 'utf8',
          enum: ['utf8', 'ascii', 'base64', 'hex'],
        },
        {
          name: 'create_directories',
          type: 'boolean',
          description: 'Create parent directories if they don\'t exist',
          required: false,
          default: false,
        },
        {
          name: 'pattern',
          type: 'string',
          description: 'Search pattern (for search operations)',
          required: false,
        },
        {
          name: 'recursive',
          type: 'boolean',
          description: 'Perform operation recursively',
          required: false,
          default: false,
        },
        {
          name: 'destination',
          type: 'string',
          description: 'Destination path (for copy/move operations)',
          required: false,
        },
      ],
      configuration: {
        timeout: 10000,
        retries: 2,
      },
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}