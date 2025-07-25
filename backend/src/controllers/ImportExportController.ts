import { Request, Response, NextFunction } from 'express';
import { ImportExportService, ImportOptions, ExportOptions } from '../services/ImportExportService';
import { BaseController } from './BaseController';
import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

/**
 * Controller for handling import and export operations
 */
export class ImportExportController extends BaseController {
  private importExportService: ImportExportService;
  private upload: multer.Multer;
  private tempDir: string;

  constructor() {
    super();
    this.importExportService = ImportExportService.getInstance();
    
    // Set up multer for file uploads
    this.tempDir = path.join(os.tmpdir(), 'airtable-clone-uploads');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Configure multer storage
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });
    
    // Configure multer file filter
    const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files are allowed'));
      }
    };
    
    // Create multer instance
    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
      }
    });
  }

  /**
   * Import data from a file
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  public importData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get file from request
      if (!req.file) {
        this.badRequest(res, 'No file uploaded');
        return;
      }
      
      // Get options from request
      const options: ImportOptions = {
        detectFieldTypes: req.body.detectFieldTypes === 'true',
        headerRow: req.body.headerRow !== 'false',
        sheetIndex: req.body.sheetIndex ? parseInt(req.body.sheetIndex) : 0,
        createTable: req.body.createTable === 'true',
        tableId: req.body.tableId,
        baseId: req.body.baseId,
        tableName: req.body.tableName
      };
      
      // Validate options
      if (options.createTable) {
        if (!options.baseId || !options.tableName) {
          this.badRequest(res, 'baseId and tableName are required when creating a new table');
          return;
        }
      } else {
        if (!options.tableId) {
          this.badRequest(res, 'tableId is required when importing to an existing table');
          return;
        }
      }
      
      // Read file
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // Determine file type and process accordingly
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      let jobId: string;
      
      if (fileExt === '.csv') {
        jobId = await this.importExportService.importCsv(fileBuffer, options);
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        jobId = await this.importExportService.importExcel(fileBuffer, options);
      } else {
        this.badRequest(res, 'Unsupported file format');
        return;
      }
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      // Return job ID
      this.ok(res, { jobId });
    } catch (error) {
      logger.error('Import error:', error);
      next(error);
    }
  };

  /**
   * Get import progress
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  public getImportProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        this.badRequest(res, 'Job ID is required');
        return;
      }
      
      const progress = this.importExportService.getImportProgress(jobId);
      
      if (!progress) {
        this.notFound(res, `Import job with ID ${jobId} not found`);
        return;
      }
      
      this.ok(res, progress);
    } catch (error) {
      logger.error('Get import progress error:', error);
      next(error);
    }
  };

  /**
   * Export data to a file
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  public exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;
      
      if (!tableId) {
        this.badRequest(res, 'Table ID is required');
        return;
      }
      
      // Get options from request
      const options: ExportOptions = {
        format: (req.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: req.query.includeHeaders !== 'false',
        fileName: req.query.fileName as string,
        viewId: req.query.viewId as string
      };
      
      // Export data
      const filePath = await this.importExportService.exportData(tableId, options);
      
      // Set headers for file download
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      // Set content type based on format
      switch (options.format) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          break;
        case 'xlsx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          break;
      }
      
      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Clean up file after sending
      fileStream.on('end', () => {
        this.importExportService.cleanupTempFile(filePath);
      });
    } catch (error) {
      logger.error('Export error:', error);
      next(error);
    }
  };

  /**
   * Get multer upload middleware
   * @returns Multer middleware
   */
  public getUploadMiddleware() {
    return this.upload.single('file');
  }
}