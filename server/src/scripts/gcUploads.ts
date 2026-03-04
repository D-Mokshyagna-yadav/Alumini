import fs from 'fs';
import path from 'path';
import User from '../models/User';
import Post from '../models/Post';
import Event from '../models/Event';
import { Message } from '../models/Message';

// Walk directory recursively and collect file paths
const walk = (dir: string, fileList: string[] = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, fileList);
        } else {
            fileList.push(full);
        }
    }
    return fileList;
};

export const runGC = async (uploadsRoot?: string) => {
    try {
        const uploadsDir = uploadsRoot || path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) return;

        // Collect referenced basenames from DB
        const referenced = new Set<string>();

        const normalizeToRel = (val: string | undefined) => {
            if (!val) return null;
            const uploadsIndex = val.indexOf('/uploads/');
            let rel = val;
            if (uploadsIndex >= 0) rel = val.substring(uploadsIndex + '/uploads/'.length);
            rel = rel.replace(/^\/?uploads\//, '');
            return rel; // e.g. username/profile/file.jpg or username/posts/file.mp4
        };

        const users = await User.find().select('avatar coverImage').lean();
        users.forEach(u => {
            const a = normalizeToRel((u as any).avatar);
            if (a) referenced.add(a);
            const c = normalizeToRel((u as any).coverImage);
            if (c) referenced.add(c);
        });

        const posts = await Post.find().select('media.url').lean();
        posts.forEach(p => {
            (p as any).media?.forEach((m: any) => {
                const r = normalizeToRel(m?.url);
                if (r) referenced.add(r);
            });
        });

        const events = await Event.find().select('bannerImage').lean();
        events.forEach(ev => {
            const r = normalizeToRel((ev as any).bannerImage);
            if (r) referenced.add(r);
        });

        const messages = await Message.find().select('media.url').lean();
        messages.forEach(msg => {
            (msg as any).media?.forEach((m: any) => {
                const r = normalizeToRel(m?.url);
                if (r) referenced.add(r);
            });
        });

        // Walk uploads folder
        const files = walk(uploadsDir, []);

        const now = Date.now();
        const minAgeMs = 1000 * 60 * 60 * 24; // only delete files older than 24 hours

        let deleted = 0;

        for (const file of files) {
            try {
                const rel = path.relative(uploadsDir, file).replace(/\\/g, '/');
                // referenced set contains relative paths like 'username/profile/file.jpg'
                if (!referenced.has(rel)) {
                    const stats = fs.statSync(file);
                    const age = now - stats.mtimeMs;
                    if (age > minAgeMs) {
                        fs.unlinkSync(file);
                        deleted++;
                    }
                }
            } catch (err) {
                console.warn('GC: failed to evaluate/delete', file, err);
            }
        }

        console.log(`GC: scanned ${files.length} files, deleted ${deleted} orphaned files`);
    } catch (err) {
        console.error('GC failed', err);
    }
};

export default runGC;