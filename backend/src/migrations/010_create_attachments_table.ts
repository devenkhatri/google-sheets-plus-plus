import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('record_id').notNullable().references('id').inTable('records').onDelete('CASCADE');
    table.uuid('field_id').notNullable().references('id').inTable('fields').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.string('url').notNullable();
    table.string('thumbnail_url').nullable();
    table.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('record_id');
    table.index('field_id');
    table.index(['record_id', 'field_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('attachments');
}