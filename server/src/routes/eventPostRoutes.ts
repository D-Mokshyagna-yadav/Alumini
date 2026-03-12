import express from 'express';
import EventPost from '../models/EventPost';
import Event from '../models/Event';
import User from '../models/User';
import Notification from '../models/Notification';
import { cacheMiddleware, TTL } from '../config/cache';
import { requireSession } from '../middleware/auth';

const router = express.Router();

// GET /api/event-posts/:eventId - Get all posts for an event
router.get('/:eventId', cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const posts = await EventPost.find({ event: req.params.eventId })
            .populate('author', 'name graduationYear avatar')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 });

        const payload = posts.map(p => ({
            id: p._id,
            content: p.content,
            author: {
                id: (p.author as any)._id,
                name: (p.author as any).name,
                batch: (p.author as any).graduationYear,
                avatar: (p.author as any).avatar
            },
            likes: p.likesCount,
            comments: p.commentsCount,
            isLiked: req.session?.userId ? p.likes.some(l => String(l) === String(req.session!.userId)) : false,
            commentsList: p.comments.map(c => ({
                author: {
                    id: (c.author as any)._id,
                    name: (c.author as any).name,
                    avatar: (c.author as any).avatar
                },
                content: c.content,
                createdAt: c.createdAt
            })),
            createdAt: p.createdAt
        }));

        res.json({ posts: payload });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/event-posts/:eventId - Create a new post
router.post('/:eventId', requireSession, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const post = new EventPost({
            event: req.params.eventId,
            author: req.session!.userId,
            content: content.trim(),
            likes: [],
            likesCount: 0,
            comments: [],
            commentsCount: 0
        });

        await post.save();
        await post.populate('author', 'name graduationYear avatar');

        res.status(201).json({ 
            message: 'Post created',
            post: {
                id: post._id,
                content: post.content,
                author: {
                    id: (post.author as any)._id,
                    name: (post.author as any).name,
                    batch: (post.author as any).graduationYear,
                    avatar: (post.author as any).avatar
                },
                likes: 0,
                comments: 0,
                isLiked: false,
                commentsList: [],
                createdAt: post.createdAt
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/event-posts/:postId/like - Toggle like on a post
router.post('/:postId/like', requireSession, async (req, res) => {
    try {
        const post = await EventPost.findById(req.params.postId).populate('author', 'name');
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const userId = req.session!.userId!;
        const hasLiked = post.likes.some(l => String(l) === String(userId));

        if (hasLiked) {
            // Unlike
            post.likes = post.likes.filter(l => String(l) !== String(userId));
            post.likesCount = Math.max(0, post.likesCount - 1);
        } else {
            // Like
            post.likes.push(userId as any);
            post.likesCount += 1;

            // Create notification for post author (if not self-like)
            if (String(post.author._id || post.author) !== String(userId)) {
                try {
                    const user = await User.findById(userId);
                    await Notification.create({
                        recipient: post.author._id || post.author,
                        actor: userId,
                        type: 'event_post_like',
                        message: `${user?.name || 'Someone'} liked your post`,
                        data: { post: post._id, event: post.event }
                    });
                } catch (e) {
                    console.error('Notification error', e);
                }
            }
        }

        await post.save();

        // Send real-time notification to post author if liked (not unliked)
        if (!hasLiked && String(post.author._id || post.author) !== String(userId)) {
            try {
                const io = (req as any).io;
                if (io) {
                    const user = await User.findById(userId);
                    io.to(String(post.author._id || post.author)).emit('notification', {
                        message: `${user?.name || 'Someone'} liked your event post`,
                        type: 'event_post_like',
                        postId: post._id
                    });
                }
            } catch (e) {
                console.error('Socket emit error', e);
            }
        }

        res.json({ 
            message: hasLiked ? 'Unliked' : 'Liked',
            isLiked: !hasLiked,
            likes: post.likesCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/event-posts/:postId/comment - Add a comment to a post
router.post('/:postId/comment', requireSession, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const post = await EventPost.findById(req.params.postId).populate('author', 'name');
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        post.comments.push({
            author: user._id as any,
            content: content.trim(),
            createdAt: new Date()
        });
        post.commentsCount += 1;

        await post.save();
        await post.populate('comments.author', 'name avatar');

        const newComment = post.comments[post.comments.length - 1];

        // Send notification to post author
        if (String(post.author._id || post.author) !== String(user._id)) {
            try {
                await Notification.create({
                    recipient: post.author._id || post.author,
                    actor: user._id,
                    type: 'event_post_comment',
                    message: `${user.name} commented on your event post`,
                    data: { postId: post._id, eventId: post.event, comment: content.trim() }
                });

                const io = (req as any).io;
                if (io) {
                    io.to(String(post.author._id || post.author)).emit('notification', {
                        message: `${user.name} commented on your event post`,
                        type: 'event_post_comment',
                        postId: post._id
                    });
                }
            } catch (e) {
                console.error('Notification error', e);
            }
        }

        res.status(201).json({ 
            message: 'Comment added',
            comment: {
                author: {
                    id: (newComment.author as any)._id,
                    name: (newComment.author as any).name,
                    avatar: (newComment.author as any).avatar
                },
                content: newComment.content,
                createdAt: newComment.createdAt
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as eventPostRouter };
