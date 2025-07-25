import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AutomationService } from '../services/AutomationService';
import { AutomationRule } from '../models/AutomationRule';
import { logger } from '../utils/logger';

export class AutomationController extends BaseController {
  private automationService: AutomationService;

  constructor() {
    super();
    this.automationService = new AutomationService();
  }

  /**
   * @swagger
   * /api/bases/{baseId}/automations:
   *   get:
   *     summary: Get automation rules for a base
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: baseId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of automation rules
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AutomationRule'
   */
  getAutomationRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const { baseId } = req.params;
      const rules = await this.automationService.getAutomationRules(baseId);
      
      this.sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching automation rules:', error);
      this.sendError(res, 'Failed to fetch automation rules', 500);
    }
  };

  /**
   * @swagger
   * /api/bases/{baseId}/automations:
   *   post:
   *     summary: Create a new automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: baseId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAutomationRuleRequest'
   *     responses:
   *       201:
   *         description: Automation rule created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AutomationRule'
   */
  createAutomationRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { baseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        this.sendError(res, 'User not authenticated', 401);
        return;
      }

      const ruleData = {
        ...req.body,
        baseId,
        createdBy: userId
      };

      const rule = await this.automationService.createAutomationRule(ruleData);
      
      this.sendSuccess(res, rule, 201);
    } catch (error) {
      logger.error('Error creating automation rule:', error);
      this.sendError(res, 'Failed to create automation rule', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}:
   *   get:
   *     summary: Get a specific automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Automation rule details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AutomationRule'
   */
  getAutomationRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      const rule = await this.automationService.getAutomationRule(ruleId);
      
      if (!rule) {
        this.sendError(res, 'Automation rule not found', 404);
        return;
      }

      this.sendSuccess(res, rule);
    } catch (error) {
      logger.error('Error fetching automation rule:', error);
      this.sendError(res, 'Failed to fetch automation rule', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}:
   *   put:
   *     summary: Update an automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateAutomationRuleRequest'
   *     responses:
   *       200:
   *         description: Automation rule updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AutomationRule'
   */
  updateAutomationRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      const rule = await this.automationService.updateAutomationRule(ruleId, updates);
      
      this.sendSuccess(res, rule);
    } catch (error) {
      logger.error('Error updating automation rule:', error);
      this.sendError(res, 'Failed to update automation rule', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}:
   *   delete:
   *     summary: Delete an automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Automation rule deleted successfully
   */
  deleteAutomationRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      await this.automationService.deleteAutomationRule(ruleId);
      
      this.sendSuccess(res, null, 204);
    } catch (error) {
      logger.error('Error deleting automation rule:', error);
      this.sendError(res, 'Failed to delete automation rule', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}/execute:
   *   post:
   *     summary: Manually execute an automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               triggerData:
   *                 type: object
   *                 description: Optional data to pass to the automation
   *     responses:
   *       200:
   *         description: Automation executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AutomationExecution'
   */
  executeAutomation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      const { triggerData } = req.body;

      const execution = await this.automationService.executeAutomation(ruleId, triggerData);
      
      this.sendSuccess(res, execution);
    } catch (error) {
      logger.error('Error executing automation:', error);
      this.sendError(res, 'Failed to execute automation', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}/executions:
   *   get:
   *     summary: Get execution history for an automation rule
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Execution history
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AutomationExecution'
   */
  getExecutionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const executions = await this.automationService.getExecutionHistory(ruleId, limit);
      
      this.sendSuccess(res, executions);
    } catch (error) {
      logger.error('Error fetching execution history:', error);
      this.sendError(res, 'Failed to fetch execution history', 500);
    }
  };

  /**
   * @swagger
   * /api/automations/{ruleId}/toggle:
   *   post:
   *     summary: Toggle automation rule enabled/disabled state
   *     tags: [Automations]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Automation rule toggled successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AutomationRule'
   */
  toggleAutomationRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ruleId } = req.params;
      
      const currentRule = await this.automationService.getAutomationRule(ruleId);
      if (!currentRule) {
        this.sendError(res, 'Automation rule not found', 404);
        return;
      }

      const updatedRule = await this.automationService.updateAutomationRule(ruleId, {
        enabled: !currentRule.enabled
      });
      
      this.sendSuccess(res, updatedRule);
    } catch (error) {
      logger.error('Error toggling automation rule:', error);
      this.sendError(res, 'Failed to toggle automation rule', 500);
    }
  };
}