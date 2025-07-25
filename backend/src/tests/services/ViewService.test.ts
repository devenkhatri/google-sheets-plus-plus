import { ViewService } from '../../services/ViewService';
import { ViewRepository } from '../../repositories/ViewRepository';
import { TableRepository } from '../../repositories/TableRepository';
import { BaseRepository } from '../../repositories/BaseRepository';
import { AppError } from '../../middleware/errorHandler';

// Mock the repositories
jest.mock('../../repositories/ViewRepository');
jest.mock('../../repositories/TableRepository');
jest.mock('../../repositories/BaseRepository');

describe('ViewService', () => {
  let viewService: ViewService;
  let mockViewRepository: jest.Mocked<ViewRepository>;
  let mockTableRepository: jest.Mocked<TableRepository>;
  let mockBaseRepository: jest.Mocked<BaseRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockViewRepository = new ViewRepository() as jest.Mocked<ViewRepository>;
    mockTableRepository = new TableRepository() as jest.Mocked<TableRepository>;
    mockBaseRepository = new BaseRepository() as jest.Mocked<BaseRepository>;

    // Create service instance with mocked repositories
    viewService = new ViewService();
    (viewService as any).viewRepository = mockViewRepository;
    (viewService as any).tableRepository = mockTableRepository;
    (viewService as any).baseRepository = mockBaseRepository;
  });

  describe('createView', () => {
    const tableId = 'table-123';
    const userId = 'user-123';
    const baseId = 'base-123';
    const viewData = {
      name: 'Test View',
      type: 'grid' as const,
      configuration: { frozenColumns: 1 },
    };

    it('should create a view successfully', async () => {
      // Mock repository responses
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.nameExistsInTable.mockResolvedValue(false);
      mockViewRepository.create.mockResolvedValue({
        id: 'view-123',
        table_id: tableId,
        ...viewData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Call the service method
      const result = await viewService.createView(tableId, userId, viewData);

      // Assertions
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.nameExistsInTable).toHaveBeenCalledWith(tableId, viewData.name);
      expect(mockViewRepository.create).toHaveBeenCalledWith({
        ...viewData,
        table_id: tableId,
      });
      expect(result).toHaveProperty('id', 'view-123');
      expect(result).toHaveProperty('table_id', tableId);
      expect(result).toHaveProperty('name', viewData.name);
      expect(result).toHaveProperty('type', viewData.type);
    });

    it('should throw an error if table not found', async () => {
      // Mock repository responses
      mockTableRepository.findById.mockResolvedValue(null);

      // Call the service method and expect it to throw
      await expect(viewService.createView(tableId, userId, viewData)).rejects.toThrow(
        new AppError('Table not found', 404)
      );

      // Assertions
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).not.toHaveBeenCalled();
      expect(mockViewRepository.create).not.toHaveBeenCalled();
    });

    it('should throw an error if user does not have access', async () => {
      // Mock repository responses
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: false, permissionLevel: null });

      // Call the service method and expect it to throw
      await expect(viewService.createView(tableId, userId, viewData)).rejects.toThrow(
        new AppError('You do not have access to this table', 403)
      );

      // Assertions
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.create).not.toHaveBeenCalled();
    });

    it('should throw an error if user does not have permission', async () => {
      // Mock repository responses
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'viewer' });

      // Call the service method and expect it to throw
      await expect(viewService.createView(tableId, userId, viewData)).rejects.toThrow(
        new AppError('You do not have permission to create views in this table', 403)
      );

      // Assertions
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.create).not.toHaveBeenCalled();
    });

    it('should throw an error if view name already exists', async () => {
      // Mock repository responses
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.nameExistsInTable.mockResolvedValue(true);

      // Call the service method and expect it to throw
      await expect(viewService.createView(tableId, userId, viewData)).rejects.toThrow(
        new AppError(`A view with the name "${viewData.name}" already exists in this table`, 400)
      );

      // Assertions
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.nameExistsInTable).toHaveBeenCalledWith(tableId, viewData.name);
      expect(mockViewRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getView', () => {
    const viewId = 'view-123';
    const tableId = 'table-123';
    const baseId = 'base-123';
    const userId = 'user-123';

    it('should get a view successfully', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue({
        id: viewId,
        table_id: tableId,
        name: 'Test View',
        type: 'grid',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'viewer' });

      // Call the service method
      const result = await viewService.getView(viewId, userId);

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(result).toHaveProperty('id', viewId);
      expect(result).toHaveProperty('table_id', tableId);
    });

    it('should throw an error if view not found', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue(null);

      // Call the service method and expect it to throw
      await expect(viewService.getView(viewId, userId)).rejects.toThrow(
        new AppError('View not found', 404)
      );

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw an error if table not found', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue({
        id: viewId,
        table_id: tableId,
        name: 'Test View',
        type: 'grid',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockTableRepository.findById.mockResolvedValue(null);

      // Call the service method and expect it to throw
      await expect(viewService.getView(viewId, userId)).rejects.toThrow(
        new AppError('Table not found', 404)
      );

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).not.toHaveBeenCalled();
    });

    it('should throw an error if user does not have access', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue({
        id: viewId,
        table_id: tableId,
        name: 'Test View',
        type: 'grid',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: false, permissionLevel: null });

      // Call the service method and expect it to throw
      await expect(viewService.getView(viewId, userId)).rejects.toThrow(
        new AppError('You do not have access to this view', 403)
      );

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
    });
  });

  describe('duplicateView', () => {
    const viewId = 'view-123';
    const tableId = 'table-123';
    const baseId = 'base-123';
    const userId = 'user-123';
    const viewData = {
      id: viewId,
      table_id: tableId,
      name: 'Original View',
      type: 'grid' as const,
      configuration: { frozenColumns: 1 },
      filters: [],
      sorts: [],
      field_visibility: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should duplicate a view successfully', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue(viewData);
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.nameExistsInTable.mockResolvedValue(false);
      mockViewRepository.create.mockResolvedValue({
        ...viewData,
        id: 'view-456',
        name: 'Original View (Copy)',
      });

      // Call the service method
      const result = await viewService.duplicateView(viewId, userId);

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.nameExistsInTable).toHaveBeenCalledWith(tableId, 'Original View (Copy)');
      expect(mockViewRepository.create).toHaveBeenCalledWith({
        table_id: tableId,
        name: 'Original View (Copy)',
        type: 'grid',
        configuration: { frozenColumns: 1 },
        filters: [],
        sorts: [],
        field_visibility: {},
      });
      expect(result).toHaveProperty('id', 'view-456');
      expect(result).toHaveProperty('name', 'Original View (Copy)');
    });

    it('should use custom name when provided', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue(viewData);
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.nameExistsInTable.mockResolvedValue(false);
      mockViewRepository.create.mockResolvedValue({
        ...viewData,
        id: 'view-456',
        name: 'Custom Name',
      });

      // Call the service method
      const result = await viewService.duplicateView(viewId, userId, 'Custom Name');

      // Assertions
      expect(mockViewRepository.nameExistsInTable).toHaveBeenCalledWith(tableId, 'Custom Name');
      expect(mockViewRepository.create).toHaveBeenCalledWith({
        table_id: tableId,
        name: 'Custom Name',
        type: 'grid',
        configuration: { frozenColumns: 1 },
        filters: [],
        sorts: [],
        field_visibility: {},
      });
      expect(result).toHaveProperty('name', 'Custom Name');
    });

    it('should throw an error if duplicate name already exists', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue(viewData);
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.nameExistsInTable.mockResolvedValue(true);

      // Call the service method and expect it to throw
      await expect(viewService.duplicateView(viewId, userId)).rejects.toThrow(
        new AppError(`A view with the name "Original View (Copy)" already exists in this table`, 400)
      );

      // Assertions
      expect(mockViewRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteView', () => {
    const viewId = 'view-123';
    const tableId = 'table-123';
    const baseId = 'base-123';
    const userId = 'user-123';

    it('should delete a view successfully', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue({
        id: viewId,
        table_id: tableId,
        name: 'Test View',
        type: 'grid',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.countByTableId.mockResolvedValue(2);
      mockViewRepository.delete.mockResolvedValue(true);

      // Call the service method
      await viewService.deleteView(viewId, userId);

      // Assertions
      expect(mockViewRepository.findById).toHaveBeenCalledWith(viewId);
      expect(mockTableRepository.findById).toHaveBeenCalledWith(tableId);
      expect(mockBaseRepository.checkUserAccess).toHaveBeenCalledWith(baseId, userId);
      expect(mockViewRepository.countByTableId).toHaveBeenCalledWith(tableId);
      expect(mockViewRepository.delete).toHaveBeenCalledWith(viewId);
    });

    it('should throw an error if trying to delete the last view', async () => {
      // Mock repository responses
      mockViewRepository.findById.mockResolvedValue({
        id: viewId,
        table_id: tableId,
        name: 'Test View',
        type: 'grid',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockTableRepository.findById.mockResolvedValue({ id: tableId, base_id: baseId });
      mockBaseRepository.checkUserAccess.mockResolvedValue({ hasAccess: true, permissionLevel: 'editor' });
      mockViewRepository.countByTableId.mockResolvedValue(1);

      // Call the service method and expect it to throw
      await expect(viewService.deleteView(viewId, userId)).rejects.toThrow(
        new AppError('Cannot delete the last view in a table', 400)
      );

      // Assertions
      expect(mockViewRepository.delete).not.toHaveBeenCalled();
    });
  });
});