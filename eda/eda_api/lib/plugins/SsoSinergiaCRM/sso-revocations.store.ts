import mongoose from 'mongoose';

const COLLECTION = 'sso_revocations';
// Longer than the session lifetime, so a revoked session always expires before its record does.
const TTL_SECONDS = 18000;

let indexReady = false;

function collection() {
    return (mongoose.connection as any).db.collection(COLLECTION);
}

async function ensureIndex(): Promise<void> {
    if (indexReady) {
        return;
    }
    await collection().createIndex({ revokedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });
    indexReady = true;
}

/**
 * Revokes every SinergiaDA session issued for a user, so logging out of
 * SinergiaCRM closes the SinergiaDA sessions opened through the SSO.
 */
export async function revokeSsoSessions(email: string): Promise<void> {
    await ensureIndex();
    await collection().updateOne(
        { _id: email },
        { $set: { revokedAt: new Date() } },
        { upsert: true }
    );
}

/**
 * Tells whether the sessions of a user were revoked after the given session was issued.
 */
export async function isSessionRevoked(email: string, issuedAt?: number): Promise<boolean> {
    if (!email) {
        return false;
    }
    await ensureIndex();
    const revoked: any = await collection().findOne({ _id: email });
    if (!revoked?.revokedAt) {
        return false;
    }
    if (!issuedAt) {
        return true;
    }
    return issuedAt <= Math.floor(new Date(revoked.revokedAt).getTime() / 1000);
}
