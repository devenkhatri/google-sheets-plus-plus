import { Router } from 'express';
import { RealTimeSyncService } from '../services/RealTimeSyncService';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get connection statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const syncService = RealTimeSyncService.getInstance();
    const stats = syncService.getConnectionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting connection stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection statistics'
    });
  }
});

/**
 * Trigger cleanup of stale presence data
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    const syncService = RealTimeSyncService.getInstance();
    await syncService.cleanupStalePresence();
    
    res.json({
      success: true,
      message: 'Stale presence data cleaned up successfully'
    });
  } catch (error) {
    logger.error('Error cleaning up stale presence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup stale presence data'
    });
  }
});

/**
 * Process batch changes
 */
router.post('/batch-changes', authMiddleware, async (req, res) => {
  try {
    const { changes } = req.body;
    
    if (!Array.isArray(changes)) {
      return res.status(400).json({
        success: false,
        message: 'Changes must be an array'
      });
    }
    
    const syncService = RealTimeSyncService.getInstance();
    await syncService.processBatchChanges(changes);
    
    res.json({
      success: true,
      message: 'Batch changes processed successfully'
    });
  } catch (error) {
    logger.error('Error processing batch changes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch changes'
    });
  }
});

export { router as realTimeSyncRoutes };