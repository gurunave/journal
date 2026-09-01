import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small JSON cache on top of AsyncStorage (localStorage on web). Keys are
 * namespaced per signed-in user so switching accounts never leaks data.
 */
export async function readCache<T>(userId: string, key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`ij:${userId}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(userId: string, key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`ij:${userId}:${key}`, JSON.stringify(value));
  } catch {
    // A full or unavailable store must never break capture.
  }
}

export async function clearCache(userId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(`ij:${userId}:`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // ignore
  }
}
