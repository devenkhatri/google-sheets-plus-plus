import { Router } from 'express';
import { CommentController } from '../controllers/CommentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const commentController = new CommentController();

/**
 * @route   POST /api/comments
 * @desc    Create a new comment
 * @access  Private
 */
router.post('/', authMiddleware, commentController.createComment);

/**
 * @route   GET /api/comments/record/:record_id
 * @desc    Get comments for a record
 * @access  Private
 */
router.get('/record/:record_id', authMiddleware, commentController.getRecordComments);

/**
 * @route   GET /api/comments/:id
 * @desc    Get a comment with its replies
 * @access  Private
 */
router.get('/:id', authMiddleware, commentController.getCommentWithReplies);

/**
 * @route   PUT /api/comments/:id
 * @desc    Update a comment
 * @access  Private
 */
router.put('/:id', authMiddleware, commentController.updateComment);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Delete a comment
 * @access  Private
 */
router.delete('/:id', authMiddleware, commentController.deleteComment);

export default router;