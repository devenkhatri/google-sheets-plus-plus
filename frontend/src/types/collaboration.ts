export interface CursorPosition {
  recordId: string;
  fieldId: string;
  x?: number;
  y?: number;
}

export interface Selection {
  startRecordId: string;
  endRecordId: string;
  startFieldId: string;
  endFieldId: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  tableId: string;
  viewId: string;
  cursor?: CursorPosition;
  selection?: Selection;
  lastSeen: Date;
  color?: string;
}

export interface FieldChange {
  fieldId: string;
  oldValue?: any;
  newValue?: any;
}

export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  BULK_CREATE = 'bulk_create',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
}

export enum EntityType {
  RECORD = 'record',
  FIELD = 'field',
  TABLE = 'table',
  VIEW = 'view',
  BASE = 'base',
}

export interface ChangeEvent {
  id: string;
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  tableId?: string;
  baseId?: string;
  userId: string;
  timestamp: Date;
  changes?: FieldChange[];
  metadata?: Record<string, any>;
  version: number;
}

export enum NotificationType {
  MENTION = 'mention',
  COMMENT = 'comment',
  RECORD_CHANGE = 'record_change',
  PERMISSION_CHANGE = 'permission_change',
  BASE_SHARE = 'base_share',
  SYSTEM = 'system'
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: string;
  entity_id?: string;
  reference_id?: string;
  metadata?: any;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: string;
  record_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: Date;
  updated_at: Date;
  user_name?: string;
  user_avatar?: string;
}

export interface CommentThread {
  comment: Comment;
  replies: Comment[];
}