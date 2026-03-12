import User from '../models/User';
import Post from '../models/Post';
import Event from '../models/Event';
import { Message } from '../models/Message';
import GalleryAlbum from '../models/GalleryAlbum';
import NotableAlumni from '../models/NotableAlumni';
import NewsItem from '../models/NewsItem';
import Job from '../models/Job';
import { getGridFSBucket } from '../config/gridfs';
import logger from '../config/logger';

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

        // Helper: add a path and its .webp variant (images are auto-converted
        // to WebP on upload, but DB may store the original extension).
        const addRef = (val: string | undefined) => {
            const r = strip(val);
            if (!r) return;
            referenced.add(r);
            if (/\.(jpe?g|png|gif)$/i.test(r)) {
                referenced.add(r.replace(/\.[^.]+$/, '.webp'));
            }
        };

        const users = await User.find().select('avatar coverImage').lean();
        for (const u of users) {
            addRef((u as any).avatar);
            addRef((u as any).coverImage);
        }

        const posts = await Post.find().select('media.url').lean();
        for (const p of posts) {
            for (const m of (p as any).media || []) {
                addRef(m?.url);
            }
        }

        const events = await Event.find().select('bannerImage').lean();
        for (const ev of events) {
            addRef((ev as any).bannerImage);
        }

        const messages = await Message.find().select('media.url').lean();
        for (const msg of messages) {
            for (const m of (msg as any).media || []) {
                addRef(m?.url);
            }
        }

        const albums = await GalleryAlbum.find().select('images.url coverImage').lean();
        for (const album of albums) {
            addRef((album as any).coverImage);
            for (const img of (album as any).images || []) {
                addRef(img?.url);
            }
        }

        const notableAlumni = await NotableAlumni.find().select('image').lean();
        for (const na of notableAlumni) {
            addRef((na as any).image);
        }

        const newsItems = await NewsItem.find().select('image').lean();
        for (const ni of newsItems) {
            addRef((ni as any).image);
        }

        const jobs = await Job.find().select('image').lean();
        for (const j of jobs) {
            addRef((j as any).image);
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

        logger.log(`GC: scanned ${allFiles.length} GridFS files, deleted ${deleted} orphaned`);
    } catch (err) {
        console.error('GC failed', err);
    }
};

export default runGC;
