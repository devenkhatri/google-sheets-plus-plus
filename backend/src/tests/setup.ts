// Mock Redis client
jest.mock('../config/redis', () => ({
  redisClient: {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(300),
    decr: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(1),
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
  },
  initializeRedis: jest.fn().mockResolvedValue(undefined),
  redisConfig: {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0,
    ttl: 3600,
    keyPrefixes: {
      record: 'record:',
      table: 'table:',
      base: 'base:',
      view: 'view:',
      user: 'user:',
      query: 'query:',
    },
    ttls: {
      record: 300,
      table: 600,
      base: 1800,
      view: 600,
      user: 3600,
      query: 120,
      shortLived: 60,
      longLived: 86400,
    }
  }
}));

// Mock database
jest.mock('../config/database', () => ({
  db: jest.fn().mockReturnValue({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
  }),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));