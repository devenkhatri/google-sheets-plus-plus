import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create automation_rules table
  await knex.schema.createTable('automation_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('base_id').notNullable().references('id').inTable('bases').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.boolean('enabled').defaultTo(true);
    table.jsonb('trigger_config').notNullable(); // Stores trigger configuration
    table.jsonb('action_config').notNullable(); // Stores action configuration
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamps(true, true);
    
    table.index(['base_id']);
    table.index(['enabled']);
  });

  // Create automation_executions table for tracking execution history
  await knex.schema.createTable('automation_executions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('automation_rule_id').notNullable().references('id').inTable('automation_rules').onDelete('CASCADE');
    table.string('status').notNullable(); // 'success', 'failed', 'running'
    table.jsonb('trigger_data'); // Data that triggered the automation
    table.jsonb('execution_result'); // Result of the execution
    table.text('error_message');
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at');
    table.integer('duration_ms');
    
    table.index(['automation_rule_id']);
    table.index(['status']);
    table.index(['started_at']);
  });

  // Create scheduled_automations table for time-based triggers
  await knex.schema.createTable('scheduled_automations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('automation_rule_id').notNullable().references('id').inTable('automation_rules').onDelete('CASCADE');
    table.string('schedule_type').notNullable(); // 'once', 'recurring'
    table.string('cron_expression'); // For recurring schedules
    table.timestamp('next_run_at').notNullable();
    table.timestamp('last_run_at');
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['next_run_at']);
    table.index(['active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scheduled_automations');
  await knex.schema.dropTableIfExists('automation_executions');
  await knex.schema.dropTableIfExists('automation_rules');
}