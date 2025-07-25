import { google, sheets_v4 } from 'googleapis';
import { logger } from '../utils/logger';
import { GoogleSheetsService } from './GoogleSheetsService';
import { cacheService } from './CacheService';
import redisConfig from '../config/redis';

/**
 * Service for optimizing Google Sheets API calls through batching
 */
export class GoogleSheetsBatchService {
  private static instance: GoogleSheetsBatchService;
  private sheetsService: sheets_v4.Sheets;
  private batchQueue: Map<string, BatchOperation[]>;
  private processingQueue: boolean;
  private batchSize: number = 100; // Maximum number of operations per batch
  private batchDelay: number = 100; // Delay in ms before processing batch
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // Base delay for exponential backoff
  private readonly CACHE_PREFIX = redisConfig.keyPrefixes.query;
  private readonly CACHE_TTL = redisConfig.ttls.shortLived;

  private constructor() {
    this.sheetsService = GoogleSheetsService.getInstance().getSheetsService();
    this.batchQueue = new Map();
    this.processingQueue = false;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GoogleSheetsBatchService {
    if (!GoogleSheetsBatchService.instance) {
      GoogleSheetsBatchService.instance = new GoogleSheetsBatchService();
    }
    return GoogleSheetsBatchService.instance;
  }

  /**
   * Add a read operation to the batch queue
   */
  public async queueReadOperation(
    spreadsheetId: string,
    range: string,
    callback: (data: any[][]) => void
  ): Promise<void> {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}sheets:${spreadsheetId}:${range}`;
    const cachedData = await cacheService.get<any[][]>(cacheKey);
    
    if (cachedData) {
      callback(cachedData);
      return;
    }
    
    // Add to queue if not in cache
    const operation: BatchOperation = {
      type: 'read',
      spreadsheetId,
      range,
      callback: async (data: any) => {
        // Cache the result
        await cacheService.set(cacheKey, data, this.CACHE_TTL);
        callback(data);
      }
    };
    
    this.addToQueue(spreadsheetId, operation);
  }

  /**
   * Add a write operation to the batch queue
   */
  public queueWriteOperation(
    spreadsheetId: string,
    range: string,
    values: any[][],
    callback?: (response: any) => void
  ): void {
    const operation: BatchOperation = {
      type: 'write',
      spreadsheetId,
      range,
      values,
      callback
    };
    
    // Invalidate cache for this range
    const cacheKey = `${this.CACHE_PREFIX}sheets:${spreadsheetId}:${range}`;
    cacheService.delete(cacheKey);
    
    this.addToQueue(spreadsheetId, operation);
  }

  /**
   * Add an append operation to the batch queue
   */
  public queueAppendOperation(
    spreadsheetId: string,
    range: string,
    values: any[][],
    callback?: (response: any) => void
  ): void {
    const operation: BatchOperation = {
      type: 'append',
      spreadsheetId,
      range,
      values,
      callback
    };
    
    // Invalidate cache for this range
    const cacheKey = `${this.CACHE_PREFIX}sheets:${spreadsheetId}:${range}`;
    cacheService.delete(cacheKey);
    
    this.addToQueue(spreadsheetId, operation);
  }

  /**
   * Add a batch update operation to the queue
   */
  public queueBatchUpdateOperation(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[],
    callback?: (response: any) => void
  ): void {
    const operation: BatchOperation = {
      type: 'batchUpdate',
      spreadsheetId,
      requests,
      callback
    };
    
    // Invalidate all cache for this spreadsheet
    cacheService.deletePattern(`${this.CACHE_PREFIX}sheets:${spreadsheetId}:*`);
    
    this.addToQueue(spreadsheetId, operation);
  }

  /**
   * Add operation to the queue and schedule processing
   */
  private addToQueue(spreadsheetId: string, operation: BatchOperation): void {
    if (!this.batchQueue.has(spreadsheetId)) {
      this.batchQueue.set(spreadsheetId, []);
    }
    
    this.batchQueue.get(spreadsheetId)!.push(operation);
    
    if (!this.processingQueue) {
      this.scheduleQueueProcessing();
    }
  }

  /**
   * Schedule queue processing with a delay
   */
  private scheduleQueueProcessing(): void {
    this.processingQueue = true;
    setTimeout(() => {
      this.processQueue().catch(err => {
        logger.error('Error processing batch queue:', err);
        this.processingQueue = false;
      });
    }, this.batchDelay);
  }

  /**
   * Process all operations in the queue
   */
  private async processQueue(): Promise<void> {
    try {
      const spreadsheetIds = Array.from(this.batchQueue.keys());
      
      for (const spreadsheetId of spreadsheetIds) {
        const operations = this.batchQueue.get(spreadsheetId) || [];
        
        if (operations.length === 0) {
          this.batchQueue.delete(spreadsheetId);
          continue;
        }
        
        // Process operations in batches
        while (operations.length > 0) {
          const batch = operations.splice(0, this.batchSize);
          await this.processBatch(spreadsheetId, batch);
        }
        
        this.batchQueue.delete(spreadsheetId);
      }
    } finally {
      if (this.batchQueue.size > 0) {
        this.scheduleQueueProcessing();
      } else {
        this.processingQueue = false;
      }
    }
  }

  /**
   * Process a batch of operations for a spreadsheet
   */
  private async processBatch(spreadsheetId: string, operations: BatchOperation[]): Promise<void> {
    try {
      // Group operations by type
      const readOperations = operations.filter(op => op.type === 'read');
      const writeOperations = operations.filter(op => op.type === 'write');
      const appendOperations = operations.filter(op => op.type === 'append');
      const batchUpdateOperations = operations.filter(op => op.type === 'batchUpdate');
      
      // Process read operations
      if (readOperations.length > 0) {
        await this.processBatchReads(spreadsheetId, readOperations);
      }
      
      // Process write operations
      if (writeOperations.length > 0) {
        await this.processBatchWrites(spreadsheetId, writeOperations);
      }
      
      // Process append operations
      if (appendOperations.length > 0) {
        await this.processBatchAppends(spreadsheetId, appendOperations);
      }
      
      // Process batch update operations
      if (batchUpdateOperations.length > 0) {
        await this.processBatchUpdates(spreadsheetId, batchUpdateOperations);
      }
    } catch (error) {
      logger.error(`Error processing batch for spreadsheet ${spreadsheetId}:`, error);
      
      // Call all callbacks with error
      for (const operation of operations) {
        if (operation.callback) {
          try {
            operation.callback(null);
          } catch (callbackError) {
            logger.error('Error in operation callback:', callbackError);
          }
        }
      }
    }
  }

  /**
   * Process batch read operations
   */
  private async processBatchReads(spreadsheetId: string, operations: BatchOperation[]): Promise<void> {
    try {
      // Create batch request
      const ranges = operations.map(op => op.range);
      
      // Execute with retry
      const response = await this.executeWithRetry(async () => {
        return await this.sheetsService.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges,
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING'
        });
      });
      
      // Process results
      const valueRanges = response.data.valueRanges || [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const valueRange = valueRanges[i];
        
        if (operation.callback && valueRange) {
          try {
            operation.callback(valueRange.values || []);
          } catch (callbackError) {
            logger.error('Error in read operation callback:', callbackError);
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing batch reads for spreadsheet ${spreadsheetId}:`, error);
      throw error;
    }
  }

  /**
   * Process batch write operations
   */
  private async processBatchWrites(spreadsheetId: string, operations: BatchOperation[]): Promise<void> {
    try {
      // Create batch request
      const data = operations.map(op => ({
        range: op.range,
        values: op.values
      }));
      
      // Execute with retry
      const response = await this.executeWithRetry(async () => {
        return await this.sheetsService.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data
          }
        });
      });
      
      // Call callbacks
      for (const operation of operations) {
        if (operation.callback) {
          try {
            operation.callback(response);
          } catch (callbackError) {
            logger.error('Error in write operation callback:', callbackError);
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing batch writes for spreadsheet ${spreadsheetId}:`, error);
      throw error;
    }
  }

  /**
   * Process batch append operations
   */
  private async processBatchAppends(spreadsheetId: string, operations: BatchOperation[]): Promise<void> {
    try {
      // We can't batch append operations, so process them individually
      for (const operation of operations) {
        try {
          // Execute with retry
          const response = await this.executeWithRetry(async () => {
            return await this.sheetsService.spreadsheets.values.append({
              spreadsheetId,
              range: operation.range,
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              requestBody: {
                values: operation.values
              }
            });
          });
          
          if (operation.callback) {
            try {
              operation.callback(response);
            } catch (callbackError) {
              logger.error('Error in append operation callback:', callbackError);
            }
          }
        } catch (error) {
          logger.error(`Error processing append operation for spreadsheet ${spreadsheetId}:`, error);
          
          if (operation.callback) {
            try {
              operation.callback(null);
            } catch (callbackError) {
              logger.error('Error in append operation callback:', callbackError);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing batch appends for spreadsheet ${spreadsheetId}:`, error);
      throw error;
    }
  }

  /**
   * Process batch update operations
   */
  private async processBatchUpdates(spreadsheetId: string, operations: BatchOperation[]): Promise<void> {
    try {
      // Combine all requests
      const allRequests: sheets_v4.Schema$Request[] = [];
      
      for (const operation of operations) {
        allRequests.push(...(operation.requests || []));
      }
      
      // Execute with retry
      const response = await this.executeWithRetry(async () => {
        return await this.sheetsService.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: allRequests
          }
        });
      });
      
      // Call callbacks
      for (const operation of operations) {
        if (operation.callback) {
          try {
            operation.callback(response);
          } catch (callbackError) {
            logger.error('Error in batch update operation callback:', callbackError);
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing batch updates for spreadsheet ${spreadsheetId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a function with exponential backoff retry
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (error.code === 429 || error.code >= 500) {
          // Calculate delay with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          
          // Add jitter to prevent thundering herd
          const jitter = Math.random() * 200;
          
          logger.warn(`Retrying API call after ${delay + jitter}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }
}

/**
 * Interface for batch operations
 */
interface BatchOperation {
  type: 'read' | 'write' | 'append' | 'batchUpdate';
  spreadsheetId: string;
  range?: string;
  values?: any[][];
  requests?: sheets_v4.Schema$Request[];
  callback?: (response: any) => void;
}

// Export singleton instance
export const googleSheetsBatchService = GoogleSheetsBatchService.getInstance();