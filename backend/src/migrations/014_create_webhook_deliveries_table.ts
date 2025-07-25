import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('webhook_deliveries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('webhook_id').notNullable().references('id').inTable('webhooks').onDelete('CASCADE');
    table.string('event').notNullable();
    table.jsonb('payload').notNullable();
    table.integer('status_code').nullable();
    table.text('response_body').nullable();
    table.boolean('success').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('webhook_id');
    table.index('event');
    table.index('success');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('webhook_deliveries');
}