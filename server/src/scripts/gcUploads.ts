import User from '../models/User';
import Post from '../models/Post';
import Event from '../models/Event';
import { Message } from '../models/Message';
import GalleryAlbum from '../models/GalleryAlbum';
import { getGridFSBucket } from '../config/gridfs';

/**
 * Garbage-collect orphaned files from GridFS.
 * Collects every referenced upload path from the DB, then walks the
 * uploads.files collection and deletes any file whose filename is
 * not in the referenced set and is older than 24 h.
 */
export const runGC = async () => {
    try {
        const bucket = getGridFSBucket();

        // 1. Collect referenced GridFS filenames (without leading /api/uploads/)
        const referenced = new Set<string>();

        const strip = (val: string | undefined) => {
            if (!val) return null;
            let rel = val;
            const idx = rel.indexOf('/uploads/');
            if (idx >= 0) rel = rel.substring(idx + '/uploads/'.length);
            rel = rel.replace(/^\/?(?:api\/)?uploads\//, '');
            return rel || null;
        };

        const users = await User.find().select('avatar coverImage').lean();
        for (const u of users) {
            const a = strip((u as any).avatar);
            if (a) referenced.add(a);
            const c = strip((u as any).coverImage);
            if (c) referenced.add(c);
        }

        const posts = await Post.find().select('media.url').lean();
        for (const p of posts) {
            for (const m of (p as any).media || []) {
                const r = strip(m?.url);
                if (r) referenced.add(r);
            }
        }

        const events = await Event.find().select('bannerImage').lean();
        for (const ev of events) {
            const r = strip((ev as any).bannerImage);
            if (r) referenced.add(r);
        }

        const messages = await Message.find().select('media.url').lean();
        for (const msg of messages) {
            for (const m of (msg as any).media || []) {
                const r = strip(m?.url);
                if (r) referenced.add(r);
            }
        }

        const albums = await GalleryAlbum.find().select('images.url coverImage').lean();
        for (const album of albums) {
            const c = strip((album as any).coverImage);
            if (c) referenced.add(c);
            for (const img of (album as any).images || []) {
                const r = strip(img?.url);
                if (r) referenced.add(r);
            }
        }

        // 2. Walk GridFS uploads.files collection
        const allFiles = await bucket.find().toArray();
        const now = Date.now();
        const minAgeMs = 1000 * 60 * 60 * 24; // 24 hours

        let deleted = 0;
        for (const file of allFiles) {
            if (!referenced.has(file.filename)) {
                const age = now - (file.uploadDate?.getTime() || 0);
                if (age > minAgeMs) {
                    await bucket.delete(file._id);
                    deleted++;
                }
            }
        }

        console.log(`GC: scanned ${allFiles.length} GridFS files, deleted ${deleted} orphaned`);
    } catch (err) {
        console.error('GC failed', err);
    }
};

export default runGC;
