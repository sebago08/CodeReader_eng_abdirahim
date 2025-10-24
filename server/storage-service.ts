import { supabase, isSupabaseConfigured } from './supabase';

export interface StorageService {
  uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<{ url: string; error?: string }>;
  deleteFile(bucket: string, path: string): Promise<{ error?: string }>;
  getPublicUrl(bucket: string, path: string): string;
  listFiles(bucket: string, prefix?: string): Promise<{ files: string[]; error?: string }>;
}

class SupabaseStorageService implements StorageService {
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    if (!supabase) {
      return { url: '', error: 'Supabase not configured' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { url: '', error: error.message };
    }

    const url = this.getPublicUrl(bucket, path);
    return { url };
  }

  async deleteFile(bucket: string, path: string) {
    if (!supabase) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  getPublicUrl(bucket: string, path: string): string {
    if (!supabase) {
      return '';
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async listFiles(bucket: string, prefix?: string) {
    if (!supabase) {
      return { files: [], error: 'Supabase not configured' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix || '');

    if (error) {
      return { files: [], error: error.message };
    }

    return { files: data?.map(f => f.name) || [] };
  }
}

class MockStorageService implements StorageService {
  private storage = new Map<string, { buffer: Buffer; contentType: string }>();

  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const key = `${bucket}/${path}`;
    this.storage.set(key, { buffer: file, contentType });
    const url = `/api/storage/${bucket}/${path}`;
    return { url };
  }

  async deleteFile(bucket: string, path: string) {
    const key = `${bucket}/${path}`;
    this.storage.delete(key);
    return {};
  }

  getPublicUrl(bucket: string, path: string): string {
    return `/api/storage/${bucket}/${path}`;
  }

  async listFiles(bucket: string, prefix?: string) {
    const files: string[] = [];
    const searchPrefix = prefix ? `${bucket}/${prefix}` : `${bucket}/`;
    
    for (const [key] of Array.from(this.storage.entries())) {
      if (key.startsWith(searchPrefix)) {
        const fileName = key.substring(searchPrefix.length);
        files.push(fileName);
      }
    }
    
    return { files };
  }

  getFile(bucket: string, path: string) {
    const key = `${bucket}/${path}`;
    return this.storage.get(key);
  }
}

const mockStorage = new MockStorageService();

export function getStorageService(): StorageService {
  if (isSupabaseConfigured()) {
    return new SupabaseStorageService();
  }
  return mockStorage;
}

export function getMockStorage() {
  return mockStorage;
}
