import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('search_notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('savedSearchId').notNullable().references('id').inTable('saved_searches').onDelete('CASCADE');
    table.integer('resultCount').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('savedSearchId');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('search_notifications');
}