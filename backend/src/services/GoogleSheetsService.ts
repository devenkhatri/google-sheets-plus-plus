import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { cacheService } from './CacheService';
import redisConfig from '../config/redis';

/**
 * Service for interacting with Google Sheets API
 */
export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private sheets: sheets_v4.Sheets;
  private readonly CACHE_PREFIX = redisConfig.keyPrefixes.query + 'google_sheets:';
  private readonly CACHE_TTL = redisConfig.ttls.shortLived;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize Google Sheets API client
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }
  
  /**
   * Get the Google Sheets API client
   */
  public getSheetsService(): sheets_v4.Sheets {
    return this.sheets;
  }

  /**
   * Create a new spreadsheet
   */
  public async createSpreadsheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
        },
      });

      if (!response.data.spreadsheetId) {
        throw new AppError('Failed to create spreadsheet', 500);
      }

      return response.data.spreadsheetId;
    } catch (error) {
      logger.error('Error creating spreadsheet:', error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Create a new sheet within a spreadsheet
   */
  public async createSheet(spreadsheetId: string, title: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                },
              },
            },
          ],
        },
      });

      const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
      if (sheetId === undefined || sheetId === null) {
        throw new AppError('Failed to create sheet', 500);
      }

      return sheetId;
    } catch (error) {
      logger.error(`Error creating sheet "${title}" in spreadsheet ${spreadsheetId}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Get spreadsheet metadata
   */
  public async getSpreadsheet(spreadsheetId: string): Promise<sheets_v4.Schema$Spreadsheet> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}spreadsheet:${spreadsheetId}`;
      const cachedData = await cacheService.get<sheets_v4.Schema$Spreadsheet>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const response = await this.retryOperation(() =>
        this.sheets.spreadsheets.get({
          spreadsheetId,
        })
      );

      if (!response.data) {
        throw new AppError('Failed to get spreadsheet', 500);
      }

      // Cache the result
      await cacheService.set(cacheKey, response.data, this.CACHE_TTL);

      return response.data;
    } catch (error) {
      logger.error(`Error getting spreadsheet ${spreadsheetId}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Get values from a range in a spreadsheet
   */
  public async getValues(
    spreadsheetId: string,
    range: string
  ): Promise<sheets_v4.Schema$ValueRange> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}values:${spreadsheetId}:${range}`;
      const cachedData = await cacheService.get<sheets_v4.Schema$ValueRange>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const response = await this.retryOperation(() =>
        this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        })
      );

      if (!response.data) {
        throw new AppError('Failed to get values', 500);
      }

      // Cache the result
      await cacheService.set(cacheKey, response.data, this.CACHE_TTL);

      return response.data;
    } catch (error) {
      logger.error(`Error getting values from ${spreadsheetId} range ${range}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Update values in a range
   */
  public async updateValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    try {
      const response = await this.retryOperation(() =>
        this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values,
          },
        })
      );

      if (!response.data) {
        throw new AppError('Failed to update values', 500);
      }

      // Invalidate cache
      await this.invalidateRangeCache(spreadsheetId, range);

      return response.data;
    } catch (error) {
      logger.error(`Error updating values in ${spreadsheetId} range ${range}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Append values to a range
   */
  public async appendValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    try {
      const response = await this.retryOperation(() =>
        this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values,
          },
        })
      );

      if (!response.data) {
        throw new AppError('Failed to append values', 500);
      }

      // Invalidate cache
      await this.invalidateRangeCache(spreadsheetId, range);

      return response.data;
    } catch (error) {
      logger.error(`Error appending values to ${spreadsheetId} range ${range}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Delete rows from a sheet
   */
  public async deleteRows(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    try {
      await this.retryOperation(() =>
        this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex,
                    endIndex,
                  },
                },
              },
            ],
          },
        })
      );

      // Invalidate cache for the entire sheet
      await this.invalidateSheetCache(spreadsheetId, sheetId);
    } catch (error) {
      logger.error(
        `Error deleting rows from ${spreadsheetId} sheet ${sheetId} (${startIndex}-${endIndex}):`,
        error
      );
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Batch update spreadsheet
   */
  public async batchUpdate(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[]
  ): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
    try {
      const response = await this.retryOperation(() =>
        this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests,
          },
        })
      );

      if (!response.data) {
        throw new AppError('Failed to batch update spreadsheet', 500);
      }

      // Invalidate cache for the entire spreadsheet
      await this.invalidateSpreadsheetCache(spreadsheetId);

      return response.data;
    } catch (error) {
      logger.error(`Error batch updating spreadsheet ${spreadsheetId}:`, error);
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Format cells in a range
   */
  public async formatCells(
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number,
    format: sheets_v4.Schema$CellFormat
  ): Promise<void> {
    try {
      await this.retryOperation(() =>
        this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId,
                    startRowIndex,
                    endRowIndex,
                    startColumnIndex,
                    endColumnIndex,
                  },
                  cell: {
                    userEnteredFormat: format,
                  },
                  fields: 'userEnteredFormat',
                },
              },
            ],
          },
        })
      );

      // Invalidate cache for the affected range
      await this.invalidateSheetCache(spreadsheetId, sheetId);
    } catch (error) {
      logger.error(
        `Error formatting cells in ${spreadsheetId} sheet ${sheetId}:`,
        error
      );
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Set column width
   */
  public async setColumnWidth(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number,
    pixelSize: number
  ): Promise<void> {
    try {
      await this.retryOperation(() =>
        this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateDimensionProperties: {
                  range: {
                    sheetId,
                    dimension: 'COLUMNS',
                    startIndex,
                    endIndex,
                  },
                  properties: {
                    pixelSize,
                  },
                  fields: 'pixelSize',
                },
              },
            ],
          },
        })
      );

      // Invalidate cache for the sheet
      await this.invalidateSheetCache(spreadsheetId, sheetId);
    } catch (error) {
      logger.error(
        `Error setting column width in ${spreadsheetId} sheet ${sheetId}:`,
        error
      );
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Create data validation rule
   */
  public async createDataValidation(
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    columnIndex: number,
    rule: sheets_v4.Schema$DataValidationRule
  ): Promise<void> {
    try {
      await this.retryOperation(() =>
        this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                setDataValidation: {
                  range: {
                    sheetId,
                    startRowIndex,
                    endRowIndex,
                    startColumnIndex: columnIndex,
                    endColumnIndex: columnIndex + 1,
                  },
                  rule,
                },
              },
            ],
          },
        })
      );

      // Invalidate cache for the sheet
      await this.invalidateSheetCache(spreadsheetId, sheetId);
    } catch (error) {
      logger.error(
        `Error creating data validation in ${spreadsheetId} sheet ${sheetId}:`,
        error
      );
      throw this.handleGoogleSheetsError(error);
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    let delay = this.RETRY_DELAY;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (
          error.code === 429 || // Rate limit exceeded
          error.code === 503 || // Service unavailable
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT'
        ) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        // Non-retryable error
        throw this.handleGoogleSheetsError(error);
      }
    }

    // Max retries exceeded
    throw this.handleGoogleSheetsError(lastError);
  }

  /**
   * Handle Google Sheets API errors
   */
  private handleGoogleSheetsError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const status = error.code || error.status;
    const message = error.message || 'Google Sheets API error';

    switch (status) {
      case 400:
        return new AppError(`Bad request: ${message}`, 400);
      case 401:
        return new AppError('Unauthorized: Google Sheets API credentials are invalid', 401);
      case 403:
        return new AppError('Forbidden: Insufficient permissions for Google Sheets operation', 403);
      case 404:
        return new AppError('Not found: The requested spreadsheet or sheet does not exist', 404);
      case 429:
        return new AppError('Rate limit exceeded: Too many requests to Google Sheets API', 429);
      case 500:
      case 502:
      case 503:
        return new AppError('Google Sheets service unavailable', 503);
      default:
        return new AppError(`Google Sheets API error: ${message}`, 500);
    }
  }

  /**
   * Invalidate cache for a range
   */
  private async invalidateRangeCache(spreadsheetId: string, range: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}values:${spreadsheetId}:${range}`;
    await cacheService.delete(cacheKey);
  }

  /**
   * Invalidate cache for a sheet
   */
  private async invalidateSheetCache(spreadsheetId: string, sheetId: number): Promise<void> {
    // Delete all cached values for this sheet
    const pattern = `${this.CACHE_PREFIX}values:${spreadsheetId}:*`;
    await cacheService.deletePattern(pattern);
    
    // Also invalidate spreadsheet metadata
    await this.invalidateSpreadsheetCache(spreadsheetId);
  }

  /**
   * Invalidate cache for a spreadsheet
   */
  private async invalidateSpreadsheetCache(spreadsheetId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}spreadsheet:${spreadsheetId}`;
    await cacheService.delete(cacheKey);
  }
}