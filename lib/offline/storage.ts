import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema for IndexedDB
interface MarkProDB extends DBSchema {
  jobs: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      updatedAt: number;
    };
    indexes: { 'by-synced': boolean };
  };
  customers: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      updatedAt: number;
    };
  };
  pendingActions: {
    key: number;
    value: {
      id?: number;
      type: 'create' | 'update' | 'delete';
      table: string;
      data: any;
      createdAt: number;
    };
    indexes: { 'by-table': string };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      expiresAt: number;
    };
  };
  photos: {
    key: string;
    value: {
      id: string;
      jobId: string;
      blob: Blob;
      type: 'before' | 'after' | 'progress' | 'other';
      caption?: string;
      synced: boolean;
      createdAt: number;
    };
    indexes: { 'by-job': string; 'by-synced': boolean };
  };
}

const DB_NAME = 'markpro-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MarkProDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MarkProDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<MarkProDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Jobs store
      if (!db.objectStoreNames.contains('jobs')) {
        const jobStore = db.createObjectStore('jobs', { keyPath: 'id' });
        jobStore.createIndex('by-synced', 'synced');
      }
      
      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      
      // Pending actions queue
      if (!db.objectStoreNames.contains('pendingActions')) {
        const actionStore = db.createObjectStore('pendingActions', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        actionStore.createIndex('by-table', 'table');
      }
      
      // Cache store
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      
      // Photos store for offline uploads
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-job', 'jobId');
        photoStore.createIndex('by-synced', 'synced');
      }
    },
  });
  
  return dbInstance;
}

// ==========================================
// Cache Operations (SWR-like)
// ==========================================

export async function getCached<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const cached = await db.get('cache', key);
  
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    await db.delete('cache', key);
    return null;
  }
  
  return cached.data as T;
}

export async function setCache(key: string, data: any, ttlMs: number = 5 * 60 * 1000): Promise<void> {
  const db = await getDB();
  await db.put('cache', {
    key,
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function invalidateCache(keyPrefix: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cache', 'readwrite');
  const store = tx.objectStore('cache');
  
  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.key.toString().startsWith(keyPrefix)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
}

// ==========================================
// Pending Actions Queue
// ==========================================

export async function queueAction(
  type: 'create' | 'update' | 'delete',
  table: string,
  data: any
): Promise<void> {
  const db = await getDB();
  await db.add('pendingActions', {
    type,
    table,
    data,
    createdAt: Date.now(),
  });
}

export async function getPendingActions(): Promise<MarkProDB['pendingActions']['value'][]> {
  const db = await getDB();
  return db.getAll('pendingActions');
}

export async function clearPendingAction(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('pendingActions', id);
}

// ==========================================
// Job Operations
// ==========================================

export async function cacheJob(id: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('jobs', {
    id,
    data,
    synced: true,
    updatedAt: Date.now(),
  });
}

export async function getCachedJob(id: string): Promise<any | null> {
  const db = await getDB();
  const job = await db.get('jobs', id);
  return job?.data ?? null;
}

export async function getAllCachedJobs(): Promise<any[]> {
  const db = await getDB();
  const jobs = await db.getAll('jobs');
  return jobs.map(j => j.data);
}

export async function updateJobOffline(id: string, data: any): Promise<void> {
  const db = await getDB();
  
  // Update local cache
  await db.put('jobs', {
    id,
    data,
    synced: false,
    updatedAt: Date.now(),
  });
  
  // Queue for sync
  await queueAction('update', 'jobs', { id, ...data });
}

// ==========================================
// Photo Operations
// ==========================================

export async function savePhotoOffline(
  jobId: string,
  blob: Blob,
  type: 'before' | 'after' | 'progress' | 'other',
  caption?: string
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  
  await db.add('photos', {
    id,
    jobId,
    blob,
    type,
    caption,
    synced: false,
    createdAt: Date.now(),
  });
  
  return id;
}

export async function getUnsyncedPhotos(): Promise<MarkProDB['photos']['value'][]> {
  const db = await getDB();
  const index = db.transaction('photos').store.index('by-synced');
  return index.getAll(false);
}

export async function markPhotoSynced(id: string): Promise<void> {
  const db = await getDB();
  const photo = await db.get('photos', id);
  if (photo) {
    photo.synced = true;
    await db.put('photos', photo);
  }
}

export async function getJobPhotos(jobId: string): Promise<MarkProDB['photos']['value'][]> {
  const db = await getDB();
  const index = db.transaction('photos').store.index('by-job');
  return index.getAll(jobId);
}

// ==========================================
// Sync Manager
// ==========================================

export async function syncPendingChanges(supabase: any): Promise<{ success: number; failed: number }> {
  const actions = await getPendingActions();
  let success = 0;
  let failed = 0;
  
  for (const action of actions) {
    try {
      if (action.type === 'update') {
        const { error } = await supabase
          .from(action.table)
          .update(action.data)
          .eq('id', action.data.id);
        
        if (error) throw error;
      } else if (action.type === 'create') {
        const { error } = await supabase
          .from(action.table)
          .insert(action.data);
        
        if (error) throw error;
      } else if (action.type === 'delete') {
        const { error } = await supabase
          .from(action.table)
          .delete()
          .eq('id', action.data.id);
        
        if (error) throw error;
      }
      
      await clearPendingAction(action.id!);
      success++;
    } catch (err) {
      console.error('Sync failed for action:', action, err);
      failed++;
    }
  }
  
  return { success, failed };
}

// ==========================================
// Network Status
// ==========================================

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
