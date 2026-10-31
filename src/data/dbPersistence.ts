import fs from 'node:fs';
import path from 'node:path';
import { Application, PortalUser, SmsMessage } from '../types';

export interface DatabaseSnapshot {
  version: number;
  timestamp: string;
  applications: Application[];
  users: PortalUser[];
  sms: SmsMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUP_FILE = path.join(DATA_DIR, 'database.backup.json');

export function initDbStorage(initialApps: Application[], initialUsers: PortalUser[], initialSms: SmsMessage[]): DatabaseSnapshot {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as DatabaseSnapshot;
      if (parsed && Array.isArray(parsed.applications)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Persistence] Error reading database.json, initializing fresh store:', err);
  }

  // Initial snapshot
  const snapshot: DatabaseSnapshot = {
    version: 1,
    timestamp: new Date().toISOString(),
    applications: initialApps,
    users: initialUsers,
    sms: initialSms,
  };

  saveDbStorage(snapshot);
  return snapshot;
}

export function saveDbStorage(snapshot: DatabaseSnapshot): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Atomic write to prevent file corruption
    const tmpFile = DB_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[Persistence] Error persisting database.json:', err);
    return false;
  }
}

export function createDatabaseBackup(): { success: boolean; path?: string; error?: string } {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, BACKUP_FILE);
      return { success: true, path: BACKUP_FILE };
    }
    return { success: false, error: 'Database file does not exist yet.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
