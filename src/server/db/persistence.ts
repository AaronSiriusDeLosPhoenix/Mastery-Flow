import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root data directory: /data/masteryflow_database.json
const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_FILE_PATH = process.env.DATABASE_STORAGE_PATH
  ? path.resolve(process.env.DATABASE_STORAGE_PATH)
  : path.join(DATA_DIR, 'masteryflow_database.json');

export interface SerializedDatabase {
  version: number;
  lastSavedAt: string;
  config: any;
  domains: any[];
  institutions: any[];
  users: any[];
  learners: any[];
  concepts: any[];
  prerequisites: any[];
  questions: any[];
  attempts: any[];
  masteryStates: Array<{ learnerId: string; masteries: Record<string, any> }>;
  learningSessions: any[];
  recommendations: any[];
  teacherOverrides: any[];
  learningResources: any[];
  summaryNotes: any[];
  tutorChatHistories: Array<{ key: string; messages: any[] }>;
  modules: any[];
  lessons: any[];
  lessonProgress: Array<{ key: string; progress: any }>;
  activityHistory: any[];
  aiSuggestedEdges: any[];
  flashcards: any[];
  flashcardProgress: Array<{ key: string; progress: any }>;
  examSessions: any[];
  authSessions: any[];
  mlModelWeights?: any;
  predictionRecords?: any[];
  recommendationRecords?: any[];
  modelRegistry?: Array<{ version: string; entry: any }>;
  datasetMetadata?: any;
}

export class DatabasePersistence {
  private static instance: DatabasePersistence;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isWriting = false;
  private lastSavedTime: string = new Date().toISOString();

  private constructor() {
    this.ensureDataDir();
  }

  public static getInstance(): DatabasePersistence {
    if (!DatabasePersistence.instance) {
      DatabasePersistence.instance = new DatabasePersistence();
    }
    return DatabasePersistence.instance;
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create data directory:', err);
    }
  }

  public exists(): boolean {
    return fs.existsSync(DB_FILE_PATH);
  }

  public getFilePath(): string {
    return DB_FILE_PATH;
  }

  public getLastSavedTime(): string {
    return this.lastSavedTime;
  }

  public getFileStats(): { exists: boolean; sizeBytes: number; lastModified?: string } {
    if (!this.exists()) {
      return { exists: false, sizeBytes: 0 };
    }
    try {
      const stat = fs.statSync(DB_FILE_PATH);
      return {
        exists: true,
        sizeBytes: stat.size,
        lastModified: stat.mtime.toISOString(),
      };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }

  public load(): SerializedDatabase | null {
    if (!this.exists()) return null;
    try {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw) as SerializedDatabase;
      console.log(`[DatabasePersistence] Successfully loaded persistent database from ${DB_FILE_PATH}`);
      return data;
    } catch (err) {
      console.error('[DatabasePersistence] Error reading database file:', err);
      return null;
    }
  }

  public saveSync(data: SerializedDatabase): boolean {
    this.ensureDataDir();
    try {
      const tempPath = `${DB_FILE_PATH}.tmp`;
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, json, 'utf-8');
      fs.renameSync(tempPath, DB_FILE_PATH);
      this.lastSavedTime = new Date().toISOString();
      return true;
    } catch (err) {
      console.error('[DatabasePersistence] Error writing database synchronously:', err);
      return false;
    }
  }

  public scheduleSave(getData: () => SerializedDatabase, delayMs: number = 400): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      this.saveTimeout = null;
      if (this.isWriting) {
        // Re-queue if already busy writing
        this.scheduleSave(getData, 200);
        return;
      }
      this.isWriting = true;
      try {
        const data = getData();
        data.lastSavedAt = new Date().toISOString();
        const json = JSON.stringify(data, null, 2);
        const tempPath = `${DB_FILE_PATH}.tmp`;
        await fs.promises.writeFile(tempPath, json, 'utf-8');
        await fs.promises.rename(tempPath, DB_FILE_PATH);
        this.lastSavedTime = data.lastSavedAt;
      } catch (err) {
        console.error('[DatabasePersistence] Error persisting database to disk:', err);
      } finally {
        this.isWriting = false;
      }
    }, delayMs);
  }
}

export const persistence = DatabasePersistence.getInstance();
