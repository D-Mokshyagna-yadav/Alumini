import express from 'express';
import SavedCollection from '../models/SavedCollection';
import Post from '../models/Post';
import User, { UserStatus } from '../models/User';
import { cacheMiddleware, TTL } from '../config/cache';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/collections', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const userId = req.session!.userId;
        let collections = await SavedCollection.find({ user: userId }).sort({ isDefault: -1, updatedAt: -1 });
        
        if (collections.length === 0) {
            const defaultCollection = new SavedCollection({
                user: userId,
                name: 'All Saved',
                isDefault: true,
                posts: []
            });
            await defaultCollection.save();
            collections = [defaultCollection];
        }
        
        const collectionsWithCover = await Promise.all(collections.map(async (col) => {
            let cover = col.coverImage;
            if (!cover && col.posts.length > 0) {
                const firstPost = await Post.findById(col.posts[0]).select('media');
                if (firstPost && firstPost.media && firstPost.media.length > 0) {
                    cover = firstPost.media[0].url;
                }
            }
            return {
                _id: col._id,
                name: col.name,
                postCount: col.posts.length,
                coverImage: cover,
                isDefault: col.isDefault,
                updatedAt: col.updatedAt
            };
        }));
        
        res.json(collectionsWithCover);
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/collections/:id', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const userId = req.session!.userId;
        const collection = await SavedCollection.findOne({ _id: req.params.id, user: userId })
            .populate({
                path: 'posts',
                populate: {
                    path: 'author',
                    select: 'name avatar headline graduationYear degree'
                }
            });
        
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        
        res.json(collection);
    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/collections', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Collection name is required' });
        }
        
        const existing = await SavedCollection.findOne({ user: userId, name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Collection with this name already exists' });
        }
        
        const collection = new SavedCollection({
            user: userId,
            name: name.trim(),
            posts: []
        });
        
        await collection.save();
        res.status(201).json(collection);
    } catch (error) {
        console.error('Error creating collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/collections/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const { name } = req.body;
        
        const collection = await SavedCollection.findOne({ _id: req.params.id, user: userId });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        
        if (collection.isDefault) {
            return res.status(400).json({ message: 'Cannot rename default collection' });
        }
        
        if (name && name.trim()) {
            const existing = await SavedCollection.findOne({ user: userId, name: name.trim(), _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(400).json({ message: 'Collection with this name already exists' });
            }
            collection.name = name.trim();
        }
        
        await collection.save();
        res.json(collection);
    } catch (error) {
        console.error('Error updating collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/collections/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const collection = await SavedCollection.findOne({ _id: req.params.id, user: userId });
        
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        
        if (collection.isDefault) {
            return res.status(400).json({ message: 'Cannot delete default collection' });
        }
        
        await SavedCollection.deleteOne({ _id: req.params.id });
        res.json({ message: 'Collection deleted' });
    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/save/:postId', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const postId = req.params.postId;
        const { collectionId } = req.body;
        
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        let collection;
        if (collectionId) {
            collection = await SavedCollection.findOne({ _id: collectionId, user: userId });
        } else {
            collection = await SavedCollection.findOne({ user: userId, isDefault: true });
            if (!collection) {
                collection = new SavedCollection({
                    user: userId,
                    name: 'All Saved',
                    isDefault: true,
                    posts: []
                });
            }
        }
        
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        
        if (!collection.posts.includes(postId as any)) {
            collection.posts.push(postId as any);
            await collection.save();
        }
        
        res.json({ message: 'Post saved', collection: { _id: collection._id, name: collection.name } });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/unsave/:postId', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const postId = req.params.postId;
        const { collectionId } = req.body;
        
        if (collectionId) {
            await SavedCollection.updateOne(
                { _id: collectionId, user: userId },
                { $pull: { posts: postId } }
            );
        } else {
            await SavedCollection.updateMany(
                { user: userId },
                { $pull: { posts: postId } }
            );
        }
        
        res.json({ message: 'Post unsaved' });
    } catch (error) {
        console.error('Error unsaving post:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/collections/:collectionId/add/:postId', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const { collectionId, postId } = req.params;
        
        const collection = await SavedCollection.findOne({ _id: collectionId, user: userId });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        
        if (!collection.posts.includes(postId as any)) {
            collection.posts.push(postId as any);
            await collection.save();
        }
        
        res.json({ message: 'Post added to collection' });
    } catch (error) {
        console.error('Error adding post to collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/collections/:collectionId/remove/:postId', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const { collectionId, postId } = req.params;
        
        await SavedCollection.updateOne(
            { _id: collectionId, user: userId },
            { $pull: { posts: postId } }
        );
        
        res.json({ message: 'Post removed from collection' });
    } catch (error) {
        console.error('Error removing post from collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/all', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const userId = req.session!.userId;
        const collections = await SavedCollection.find({ user: userId });
        const allPostIds = [...new Set(collections.flatMap(c => c.posts.map(p => p.toString())))];
        
        const posts = await Post.find({ _id: { $in: allPostIds } })
            .populate('author', 'name avatar headline graduationYear degree')
            .sort({ createdAt: -1 });
        
        res.json({ posts, savedPostIds: allPostIds });
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/check/:postId', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const userId = req.session!.userId;
        const postId = req.params.postId;
        
        const collections = await SavedCollection.find({ user: userId, posts: postId }).select('_id name');
        const isSaved = collections.length > 0;
        
        res.json({ isSaved, collections });
    } catch (error) {
        console.error('Error checking saved status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
