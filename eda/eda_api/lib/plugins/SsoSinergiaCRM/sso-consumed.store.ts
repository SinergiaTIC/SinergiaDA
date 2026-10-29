import mongoose from 'mongoose';

const COLLECTION = 'sso_consumed';
const TTL_SECONDS = 600;

let indexReady = false;

function collection() {
  return (mongoose.connection as any).db.collection(COLLECTION);
}

async function ensureIndex(): Promise<void> {
  if (indexReady) {
    return;
  }
  await collection().createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS });
  indexReady = true;
}

/**
 * Marks an SSO token id (jti) as consumed.
 * Returns false when it was already consumed, so the caller can reject replays.
 */
export async function consumeSsoToken(jti: string): Promise<boolean> {
  await ensureIndex();
  try {
    await collection().insertOne({ _id: jti, createdAt: new Date() });
    return true;
  } catch (err: any) {
    if (err && err.code === 11000) {
      return false;
    }
    throw err;
  }
}
