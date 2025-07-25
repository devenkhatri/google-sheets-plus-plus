#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backup"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

echo "Starting database backup at $(date)"

# Perform the backup
pg_dump -Fc | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"
    
    # Set proper permissions
    chmod 600 ${BACKUP_FILE}
    
    # Delete old backups
    echo "Cleaning up backups older than ${RETENTION_DAYS} days"
    find ${BACKUP_DIR} -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # List remaining backups
    echo "Current backups:"
    ls -la ${BACKUP_DIR}
else
    echo "Backup failed!"
    exit 1
fi

echo "Backup process completed at $(date)"