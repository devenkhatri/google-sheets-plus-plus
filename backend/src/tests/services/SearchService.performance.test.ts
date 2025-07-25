import { knex } from '../../config/database';
import SearchService from '../../services/SearchService';
import { v4 as uuidv4 } from 'uuid';

describe('SearchService Performance Tests', () => {
  // Test data
  const userId = uuidv4();
  const baseId = uuidv4();
  const tableId = uuidv4();
  const recordCount = 10000; // Number of test records to create
  
  beforeAll(async () => {
    // Create test user
    await knex('users').insert({
      id: userId,
      email: 'searchtest@example.com',
      name: 'Search Test User',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create test base
    await knex('bases').insert({
      id: baseId,
      name: 'Search Test Base',
      description: 'Base for search performance testing',
      googleSheetsId: 'test-sheet-id',
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create test table
    await knex('tables').insert({
      id: tableId,
      baseId: baseId,
      name: 'Search Test Table',
      description: 'Table for search performance testing',
      googleSheetId: 123,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create test fields
    const textFieldId = uuidv4();
    const titleFieldId = uuidv4();
    const numberFieldId = uuidv4();
    
    await knex('fields').insert([
      {
        id: textFieldId,
        tableId: tableId,
        name: 'Description',
        type: 'text',
        options: {},
        required: false,
        columnIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: titleFieldId,
        tableId: tableId,
        name: 'Title',
        type: 'text',
        options: {},
        required: true,
        columnIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: numberFieldId,
        tableId: tableId,
        name: 'Number',
        type: 'number',
        options: {},
        required: false,
        columnIndex: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Create test records
    const records = [];
    
    for (let i = 0; i < recordCount; i++) {
      records.push({
        id: uuidv4(),
        tableId: tableId,
        rowIndex: i,
        fields: {
          [textFieldId]: `This is a description for record ${i}. It contains some searchable content.`,
          [titleFieldId]: `Record Title ${i}`,
          [numberFieldId]: i
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      });
    }
    
    // Insert records in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await knex('records').insert(batch);
    }
    
    console.log(`Created ${recordCount} test records for search performance testing`);
  });
  
  afterAll(async () => {
    // Clean up test data
    await knex('records').where('tableId', tableId).delete();
    await knex('fields').where('tableId', tableId).delete();
    await knex('tables').where('id', tableId).delete();
    await knex('bases').where('id', baseId).delete();
    await knex('users').where('id', userId).delete();
  });
  
  it('should perform global search within performance requirements', async () => {
    const startTime = Date.now();
    
    const { results, total } = await SearchService.search({
      userId,
      query: 'searchable',
      limit: 20,
      offset: 0
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Global search completed in ${duration}ms with ${total} results`);
    
    // Requirement 9.6: Search should return results within 1 second for datasets up to 50,000 records
    expect(duration).toBeLessThan(1000);
    expect(results.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
  });
  
  it('should perform table-specific search within performance requirements', async () => {
    const startTime = Date.now();
    
    const { results, total } = await SearchService.search({
      userId,
      query: 'Title',
      baseId,
      tableId,
      limit: 20,
      offset: 0
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Table-specific search completed in ${duration}ms with ${total} results`);
    
    // Requirement 9.6: Search should return results within 1 second for datasets up to 50,000 records
    expect(duration).toBeLessThan(1000);
    expect(results.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
  });
  
  it('should perform search with pagination', async () => {
    const startTime = Date.now();
    
    const { results: firstPage, total } = await SearchService.search({
      userId,
      query: 'Record',
      limit: 10,
      offset: 0
    });
    
    const { results: secondPage } = await SearchService.search({
      userId,
      query: 'Record',
      limit: 10,
      offset: 10
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Paginated search completed in ${duration}ms with ${total} total results`);
    
    // Verify pagination works correctly
    expect(firstPage.length).toBe(10);
    expect(secondPage.length).toBe(10);
    expect(firstPage[0].id).not.toBe(secondPage[0].id);
    
    // Requirement 9.6: Search should return results within 1 second for datasets up to 50,000 records
    expect(duration).toBeLessThan(2000); // Allow 2 seconds for two searches
  });
  
  it('should perform search with relevance ranking', async () => {
    // Insert some specific test records for relevance testing
    const exactMatchId = uuidv4();
    const partialMatchId = uuidv4();
    const fieldId = (await knex('fields').where('tableId', tableId).first()).id;
    
    await knex('records').insert([
      {
        id: exactMatchId,
        tableId: tableId,
        rowIndex: recordCount + 1,
        fields: {
          [fieldId]: 'TestQuery'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      },
      {
        id: partialMatchId,
        tableId: tableId,
        rowIndex: recordCount + 2,
        fields: {
          [fieldId]: 'This contains TestQuery somewhere in the middle'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      }
    ]);
    
    const { results } = await SearchService.search({
      userId,
      query: 'TestQuery',
      limit: 10,
      offset: 0
    });
    
    // Clean up test records
    await knex('records').whereIn('id', [exactMatchId, partialMatchId]).delete();
    
    // Verify relevance ranking - exact match should come before partial match
    const exactMatchResult = results.find(r => r.recordId === exactMatchId);
    const partialMatchResult = results.find(r => r.recordId === partialMatchId);
    
    expect(exactMatchResult).toBeDefined();
    expect(partialMatchResult).toBeDefined();
    expect(exactMatchResult!.score).toBeGreaterThan(partialMatchResult!.score);
  });
});