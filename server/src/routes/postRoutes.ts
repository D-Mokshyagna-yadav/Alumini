import express from 'express';
import Post from '../models/Post';
import User, { UserStatus } from '../models/User';
import Connection from '../models/Connection';
import Notification from '../models/Notification';
import { getSettings } from '../models/SiteSettings';
import { cacheMiddleware, TTL } from '../config/cache';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/posts - Get all posts (feed) - only approved posts
router.get('/', requireAuth, cacheMiddleware(TTL.SHORT, true), async (req, res) => {
    try {
        const userId = req.session!.userId;

        // Find accepted connections for current user
        const connections = await Connection.find({
            $or: [ { requester: userId }, { recipient: userId } ],
            status: 'accepted'
        });

        const connectedIds = connections.map(c => {
            const other = c.requester.toString() === userId ? c.recipient : c.requester;
            return other.toString();
        });

        // Only show approved posts (plus user's own pending drafts)
        // Legacy posts without status field are treated as approved
        const approvedFilter = { $or: [{ status: 'approved' }, { status: { $exists: false } }] };
        const posts = await Post.find({
            $or: [
                { ...approvedFilter, visibility: 'public' },
                { ...approvedFilter, visibility: 'connections', author: { $in: connectedIds } },
                { author: userId } // user always sees own posts (including drafts)
            ]
        })
            .populate('author', 'name headline avatar graduationYear degree')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts - Create new post (pending approval, admin auto-approved)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { content, media, visibility } = req.body;
        const user = await User.findById(req.session!.userId);
        const isAdmin = user?.role === 'admin';

        // Check auto-approval setting
        const settings = await getSettings();
        const shouldAutoApprove = isAdmin || settings.autoApprovePosts;

        const newPost = new Post({
            author: req.session!.userId,
            content,
            media: media || [],
            visibility: visibility === 'connections' ? 'connections' : 'public',
            status: shouldAutoApprove ? 'approved' : 'pending'
        });

        await newPost.save();
        const populatedPost = await Post.findById(newPost._id)
            .populate('author', 'name headline avatar graduationYear degree');

        // Only emit to feed if approved (admin posts or auto-approved)
        if (shouldAutoApprove) {
            (req as any).io?.emit('new_post', populatedPost);
        }

        res.status(201).json({
            post: populatedPost,
            message: shouldAutoApprove ? 'Post published' : 'Post submitted for admin approval'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts/:id/like - Toggle like on a post
router.post('/:id/like', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = req.session!.userId;
        const likeIndex = post.likes.findIndex(id => id.toString() === userId);

        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        } else {
            post.likes.push(userId as any);

            // Notify post author about the like (if not self-like)
            if (String(post.author) !== String(userId)) {
                try {
                    const liker = await User.findById(userId);
                    await Notification.create({
                        recipient: post.author,
                        actor: userId,
                        type: 'post_like',
                        message: `${liker?.name || 'Someone'} liked your post`,
                        data: { post: post._id }
                    });
                    const io = (req as any).io;
                    if (io) {
                        io.to(String(post.author)).emit('notification', {
                            message: `${liker?.name || 'Someone'} liked your post`,
                            type: 'post_like',
                            postId: post._id
                        });
                    }
                } catch (e) { console.error('Notification error', e); }
            }
        }

        await post.save();

        // Broadcast like update to all clients
        try {
            const io = (req as any).io;
            if (io) io.emit('post_liked', { postId: post._id, likes: post.likes, likesCount: post.likes.length });
        } catch (e) { /* ignore */ }

        res.json({ likes: post.likes.length, isLiked: likeIndex === -1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts/:id/save - Toggle save/unsave a post for current user
router.post('/:id/save', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingIndex = (user as any).savedPosts?.findIndex((p: any) => String(p) === String(post._id));

        let isSaved = true;
        if (existingIndex > -1) {
            // unsave
            (user as any).savedPosts.splice(existingIndex, 1);
            isSaved = false;
        } else {
            // save
            (user as any).savedPosts = (user as any).savedPosts || [];
            (user as any).savedPosts.push(post._id);
            isSaved = true;
        }

        await user.save();

        res.json({ saved: isSaved });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts/:id/comment - Add comment to a post
router.post('/:id/comment', requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = req.session!.userId;

        post.comments.push({
            author: userId as any,
            text,
            createdAt: new Date()
        });

        await post.save();
        const updatedPost = await Post.findById(post._id)
            .populate('comments.author', 'name avatar');

        // Notify post author about the comment (if not self-comment)
        if (String(post.author) !== String(userId)) {
            try {
                const commenter = await User.findById(userId);
                await Notification.create({
                    recipient: post.author,
                    actor: userId,
                    type: 'post_comment',
                    message: `${commenter?.name || 'Someone'} commented on your post`,
                    data: { post: post._id, comment: text }
                });
                const io = (req as any).io;
                if (io) {
                    io.to(String(post.author)).emit('notification', {
                        message: `${commenter?.name || 'Someone'} commented on your post`,
                        type: 'post_comment',
                        postId: post._id
                    });
                }
            } catch (e) { console.error('Notification error', e); }
        }

        // Broadcast comment update to all clients
        try {
            const io2 = (req as any).io;
            if (io2) io2.emit('post_commented', { postId: post._id, comments: updatedPost?.comments });
        } catch (e) { /* ignore */ }

        res.json({ comments: updatedPost?.comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts/detail/:id - Get single post with populated likes for detail view
router.get('/detail/:id', requireAuth, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name headline avatar graduationYear degree')
            .populate('comments.author', 'name avatar')
            .populate('likes', 'name avatar headline');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json({ post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts/user/:userId - Get posts by a specific user
router.get('/user/:userId', requireAuth, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const currentUserId = req.session!.userId;
        const targetUserId = req.params.userId;
        const isOwnProfile = currentUserId === targetUserId;

        let query: any = { author: targetUserId };
        
        if (!isOwnProfile) {
            // Only show approved posts for other users (legacy posts without status = approved)
            query.$or = [{ status: 'approved' }, { status: { $exists: false } }];
            const connections = await Connection.find({
                $or: [
                    { requester: currentUserId, recipient: targetUserId },
                    { requester: targetUserId, recipient: currentUserId }
                ],
                status: 'accepted'
            });
            const isConnected = connections.length > 0;
            
            if (isConnected) {
                query.$or = [
                    { visibility: 'public' },
                    { visibility: 'connections' }
                ];
            } else {
                query.visibility = 'public';
            }
        }

        const posts = await Post.find(query)
            .populate('author', 'name headline avatar graduationYear degree')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 });

        res.json({ posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:id - Edit a post (author or admin)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const user = await User.findById(req.session!.userId);
        if (post.author.toString() !== req.session!.userId && user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { content, visibility } = req.body;
        if (content !== undefined) post.content = content;
        if (visibility !== undefined) post.visibility = visibility;

        await post.save();
        const populated = await Post.findById(post._id)
            .populate('author', 'name headline avatar graduationYear degree');

        try {
            const io = (req as any).io;
            if (io) io.emit('post_updated', { postId: post._id });
        } catch (e) { /* ignore */ }

        res.json({ post: populated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/posts/:id - Delete a post (author or admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const user = await User.findById(req.session!.userId);
        if (post.author.toString() !== req.session!.userId && user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Post.findByIdAndDelete(req.params.id);

        // Broadcast post deletion to all clients
        try {
            const io = (req as any).io;
            if (io) io.emit('post_deleted', { postId: req.params.id });
        } catch (e) { /* ignore */ }

        res.json({ message: 'Post deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/posts/:postId/comments/:commentId - Delete a comment (comment author or admin)
router.delete('/:postId/comments/:commentId', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = (post.comments as any).id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const userId = req.session!.userId;
        const user = await User.findById(userId);
        if (comment.author.toString() !== userId && user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        (post.comments as any).pull({ _id: req.params.commentId });
        await post.save();

        const updatedPost = await Post.findById(post._id)
            .populate('comments.author', 'name avatar');

        // Broadcast comment deletion to all clients
        try {
            const io = (req as any).io;
            if (io) io.emit('comment_deleted', { postId: post._id, commentId: req.params.commentId, comments: updatedPost?.comments });
        } catch (e) { /* ignore */ }

        res.json({ comments: updatedPost?.comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:postId/comments/:commentId - Edit a comment (comment author or admin)
router.put('/:postId/comments/:commentId', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = (post.comments as any).id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const userId = req.session!.userId;
        const user = await User.findById(userId);
        if (comment.author.toString() !== userId && user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this comment' });
        }

        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });

        comment.text = text.trim();
        await post.save();

        const updatedPost = await Post.findById(post._id)
            .populate('comments.author', 'name avatar');

        res.json({ comments: updatedPost?.comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts/user-comments/:userId - Get all comments by a user with associated post data
router.get('/user-comments/:userId', requireAuth, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const targetUserId = req.params.userId;

        // Find all posts that have comments by this user
        const posts = await Post.find({
            'comments.author': targetUserId,
            $or: [{ status: 'approved' }, { status: { $exists: false } }]
        })
            .populate('author', 'name headline avatar')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 });

        // Extract the user's comments with their post context
        const userComments: any[] = [];
        for (const post of posts) {
            for (const comment of post.comments) {
                if (comment.author && (comment.author as any)._id?.toString() === targetUserId) {
                    userComments.push({
                        _id: (comment as any)._id,
                        text: comment.text,
                        createdAt: comment.createdAt,
                        post: {
                            _id: post._id,
                            content: post.content,
                            author: post.author,
                            createdAt: post.createdAt
                        }
                    });
                }
            }
        }

        // Sort by comment date descending
        userComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ comments: userComments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as postRouter };
