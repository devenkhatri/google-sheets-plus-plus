import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.string('entity_type').notNullable();
    table.uuid('entity_id').nullable();
    table.uuid('reference_id').nullable();
    table.jsonb('metadata').nullable();
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at').notNullable();
    
    // Indexes
    table.index('user_id');
    table.index('read');
    table.index('type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('notifications');
}