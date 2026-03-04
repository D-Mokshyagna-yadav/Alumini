import express from 'express';
import { getConversations, getMessages, sendMessage, deleteMessage, getGroupMessages, editMessage, markDelivered, markRead } from '../controllers/chatController';
import { Conversation } from '../models/Conversation';

const router = express.Router();

router.get('/conversations', getConversations);
router.get('/messages/:conversationId', getMessages);
router.get('/group/:groupId/messages', getGroupMessages);
router.post('/message', sendMessage);
router.put('/message/:messageId', editMessage);
router.delete('/message/:messageId', deleteMessage);
router.put('/delivered/:messageId', markDelivered);
router.put('/read/:conversationId', markRead);

router.put('/accept-request/:conversationId', async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const conversation = await Conversation.findById(req.params.conversationId);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        if (!conversation.participants.map(p => p.toString()).includes(userId)) {
            return res.status(403).json({ error: 'Not part of this conversation' });
        }

        conversation.isRequest = false;
        conversation.requestAcceptedAt = new Date();
        await conversation.save();

        res.json({ message: 'Message request accepted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/decline-request/:conversationId', async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const conversation = await Conversation.findById(req.params.conversationId);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        if (!conversation.participants.map(p => p.toString()).includes(userId)) {
            return res.status(403).json({ error: 'Not part of this conversation' });
        }

        await Conversation.findByIdAndDelete(req.params.conversationId);
        res.json({ message: 'Message request declined' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

export { router as chatRouter };
