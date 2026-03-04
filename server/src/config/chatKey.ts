import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Store a persistent chat encryption key so messages remain decryptable across restarts
const KEY_PATH = path.join(process.cwd(), 'chat_key.txt');

let ENCRYPTION_KEY: string;
try {
    if (fs.existsSync(KEY_PATH)) {
        ENCRYPTION_KEY = fs.readFileSync(KEY_PATH, 'utf8').trim();
        if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
            throw new Error('Invalid key length');
        }
    } else {
        // generate 32 byte hex then slice to 32 chars for utf8 key
        const generated = crypto.randomBytes(32).toString('hex').slice(0, 32);
        fs.writeFileSync(KEY_PATH, generated, { encoding: 'utf8', mode: 0o600 });
        ENCRYPTION_KEY = generated;
    }
} catch (err) {
    // fallback: generate in-memory key (not persisted)
    ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex').slice(0, 32);
    console.error('Warning: failed to read/write chat key, using in-memory key. Messages may not persist decryptability.');
}

export default ENCRYPTION_KEY;
