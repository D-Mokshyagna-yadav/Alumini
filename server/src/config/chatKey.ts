import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSettings } from '../models/SiteSettings';

// Keep legacy file path for backward compatibility during migration
const KEY_PATH = path.join(process.cwd(), 'chat_key.txt');

// Generate an in-memory key immediately so the chat controller can function
let ENCRYPTION_KEY: string = crypto.randomBytes(32).toString('hex').slice(0, 32);

// Try to read legacy file synchronously (preserve existing behaviour)
try {
    if (fs.existsSync(KEY_PATH)) {
        const val = fs.readFileSync(KEY_PATH, 'utf8').trim();
        if (val && val.length >= 32) {
            ENCRYPTION_KEY = val;
        }
    }
} catch (err) {
    // ignore — we'll migrate later
}

/**
 * After DB is connected, migrate any local chat key into SiteSettings and
 * remove the local file. If a key already exists in the DB, prefer that.
 */
export const migrateChatKeyToDB = async () => {
    try {
        const settings = await getSettings();
        if (settings.chatKey && typeof settings.chatKey === 'string' && settings.chatKey.length >= 32) {
            // DB has authoritative key — use it and remove local file
            ENCRYPTION_KEY = settings.chatKey;
            try { if (fs.existsSync(KEY_PATH)) fs.unlinkSync(KEY_PATH); } catch {}
            return ENCRYPTION_KEY;
        }

        // If DB lacks key, persist current key into DB (which may have been read from file earlier)
        settings.chatKey = ENCRYPTION_KEY;
        await settings.save();

        // Remove local file if present to avoid local-only persistence
        try { if (fs.existsSync(KEY_PATH)) fs.unlinkSync(KEY_PATH); } catch (e) { /* ignore */ }
        return ENCRYPTION_KEY;
    } catch (err) {
        console.error('Chat key migration failed:', err);
        return ENCRYPTION_KEY;
    }
};

export default ENCRYPTION_KEY;
