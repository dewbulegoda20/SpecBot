import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

// Use /tmp on Vercel (serverless), otherwise use ./uploads locally
export const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads' : (process.env.UPLOAD_DIR || './uploads');
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

export async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  const randomId = randomBytes(8).toString('hex');
  const timestamp = Date.now();
  return `${nameWithoutExt}-${timestamp}-${randomId}${ext}`;
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ filepath: string; filename: string }> {
  await ensureUploadDir();
  
  const filename = generateUniqueFilename(originalFilename);
  const filepath = path.join(UPLOAD_DIR, filename);
  
  await fs.writeFile(filepath, fileBuffer);
  
  return { filepath, filename };
}

export async function deleteFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

export function validateFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.pdf';
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}
