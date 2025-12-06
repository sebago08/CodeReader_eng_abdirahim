import * as fs from 'fs';
import * as path from 'path';

export interface StorageService {
  uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<{ url: string; error?: string }>;
  deleteFile(bucket: string, path: string): Promise<{ error?: string }>;
  getPublicUrl(bucket: string, path: string): string;
  listFiles(bucket: string, prefix?: string): Promise<{ files: string[]; error?: string }>;
}

class LocalStorageService implements StorageService {
  private baseDir: string;
  private storage = new Map<string, { buffer: Buffer; contentType: string }>();

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private ensureBucketDir(bucket: string) {
    const bucketDir = path.join(this.baseDir, bucket);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }
    return bucketDir;
  }

  async uploadFile(bucket: string, filePath: string, file: Buffer, contentType: string) {
    try {
      const bucketDir = this.ensureBucketDir(bucket);
      const fullPath = path.join(bucketDir, filePath);
      
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, file);

      const key = `${bucket}/${filePath}`;
      this.storage.set(key, { buffer: file, contentType });

      const url = `/api/storage/${bucket}/${filePath}`;
      return { url };
    } catch (error: any) {
      console.error(`Upload error for ${bucket}/${filePath}:`, error);
      return { url: '', error: error.message };
    }
  }

  async deleteFile(bucket: string, filePath: string) {
    try {
      const fullPath = path.join(this.baseDir, bucket, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      const key = `${bucket}/${filePath}`;
      this.storage.delete(key);

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }

  getPublicUrl(bucket: string, filePath: string): string {
    return `/api/storage/${bucket}/${filePath}`;
  }

  async listFiles(bucket: string, prefix?: string) {
    try {
      const bucketDir = path.join(this.baseDir, bucket);
      if (!fs.existsSync(bucketDir)) {
        return { files: [] };
      }

      const searchDir = prefix ? path.join(bucketDir, prefix) : bucketDir;
      if (!fs.existsSync(searchDir)) {
        return { files: [] };
      }

      const files = fs.readdirSync(searchDir);
      return { files };
    } catch (error: any) {
      return { files: [], error: error.message };
    }
  }

  getFile(bucket: string, filePath: string): { buffer: Buffer; contentType: string } | undefined {
    const key = `${bucket}/${filePath}`;
    
    if (this.storage.has(key)) {
      return this.storage.get(key);
    }

    const fullPath = path.join(this.baseDir, bucket, filePath);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const contentType = 'application/octet-stream';
      this.storage.set(key, { buffer, contentType });
      return { buffer, contentType };
    }

    return undefined;
  }
}

const localStorage = new LocalStorageService();

export function getStorageService(): StorageService {
  return localStorage;
}

export function getMockStorage() {
  return localStorage;
}
