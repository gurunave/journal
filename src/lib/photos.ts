import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export const PHOTO_BUCKET = 'incident-photos';

function extensionOf(uri: string): string {
  const match = /\.(jpe?g|png|heic|webp|gif)(\?|$)/i.exec(uri);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

function contentTypeOf(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

async function readAsBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
  return await new File(uri).bytes();
}

/**
 * Uploads a local image to the private bucket under `<userId>/<incidentId>.<ext>`,
 * which is the path shape the storage RLS policies check.
 */
export async function uploadIncidentPhoto(
  userId: string,
  incidentId: string,
  localUri: string,
): Promise<string> {
  const ext = extensionOf(localUri);
  const path = `${userId}/${incidentId}.${ext}`;
  const bytes = await readAsBytes(localUri);

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, {
    contentType: contentTypeOf(ext),
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeIncidentPhoto(path: string): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** Signed URLs are cached per path — the bucket is private, so links expire. */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const ttlSeconds = 3600;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) return null;

  signedUrlCache.set(path, {
    url: data.signedUrl,
    // Refresh a minute early so a long-lived screen never shows a dead image.
    expiresAt: Date.now() + (ttlSeconds - 60) * 1000,
  });
  return data.signedUrl;
}
