import { Request, Response } from 'express';
import crypto from 'crypto';
import ENCRYPTION_KEY from '../config/chatKey';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import Connection from '../models/Connection';
import mongoose from 'mongoose';

// Encryption key (persisted in server root file chat_key.txt)
const ALGORITHM = 'aes-256-gcm';

// Encrypt message content
const encrypt = (text: string): { encrypted: string; iv: string } => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
        encrypted: encrypted + ':' + authTag,
        iv: iv.toString('hex')
    };
};

// Decrypt message content
const decrypt = (encryptedData: string, ivHex: string): string => {
    try {
        const [encrypted, authTag] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return '[Encrypted Message]';
    }
};

declare module 'express-session' {
    interface SessionData {
        userId: string;
    }
}

export const getConversations = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name headline avatar isOnline')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        const formattedConvos = conversations.map(convo => {
            const otherUser = convo.participants.find((p: any) => p._id.toString() !== userId);
            const unreadCount = convo.unreadCounts.get(userId) || 0;

            let lastMessageObj: any = convo.lastMessage || null;
            if (lastMessageObj && lastMessageObj.content) {
                try {
                    const decrypted = decrypt(lastMessageObj.content, lastMessageObj.iv);
                    const plain = (typeof lastMessageObj.toObject === 'function') ? lastMessageObj.toObject() : { ...lastMessageObj };
                    plain.content = decrypted;
                    lastMessageObj = plain;
                } catch (e) {
                    const plain = (typeof lastMessageObj.toObject === 'function') ? lastMessageObj.toObject() : { ...lastMessageObj };
                    plain.content = '[Encrypted Message]';
                    lastMessageObj = plain;
                }
            }

            return {
                id: convo._id,
                user: otherUser,
                lastMessage: lastMessageObj,
                unread: unreadCount,
                updatedAt: convo.updatedAt,
                isRequest: convo.isRequest
            };
        });

        const regularChats = formattedConvos.filter(c => !c.isRequest);
        const messageRequests = formattedConvos.filter(c => c.isRequest);

        res.json({ conversations: regularChats, messageRequests });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { conversationId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const messages = await Message.find({
            conversationId,
            deletedFor: { $ne: userId },
            isDeletedForEveryone: false
        }).sort({ createdAt: 1 });

        // Decrypt messages for response
        const decryptedMessages = messages.map(msg => ({
            ...msg.toObject(),
            content: decrypt(msg.content, msg.iv),
            iv: undefined // Don't expose IV to client
        }));

        // Reset unread count
        await Conversation.findByIdAndUpdate(conversationId, {
            [`unreadCounts.${userId}`]: 0
        });

        res.json(decryptedMessages);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { recipientId, content = '', type = 'text', groupId, media } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { encrypted, iv } = encrypt(content || '');

        let conversation;
        let isNewRequest = false;
        
        if (!groupId) {
            conversation = await Conversation.findOne({
                participants: { $all: [userId, recipientId] }
            });

            if (!conversation) {
                const connection = await Connection.findOne({
                    $or: [
                        { requester: userId, recipient: recipientId },
                        { requester: recipientId, recipient: userId }
                    ],
                    status: 'accepted'
                });
                
                const isConnected = !!connection;
                isNewRequest = !isConnected;
                
                conversation = await Conversation.create({
                    participants: [userId, recipientId],
                    unreadCounts: { [userId]: 0, [recipientId]: 0 },
                    isRequest: isNewRequest
                });
            }
        }

        const messageData: any = {
            conversationId: conversation?._id,
            groupId: groupId || undefined,
            sender: userId,
            content: encrypted,
            iv,
            type,
            status: 'sent'
        };

        if (media && Array.isArray(media) && media.length > 0) {
            messageData.media = media;
            if (!type || type === 'text') {
                const mt = (media[0].type || '').toLowerCase();
                if (mt === 'video' || mt.startsWith('video')) messageData.type = 'video';
                else if (mt === 'audio' || mt.startsWith('audio')) messageData.type = 'audio';
                else if (mt === 'image' || mt.startsWith('image')) messageData.type = 'image';
                else messageData.type = 'file';
            }
        }

        const newMessage = await Message.create(messageData);

        if (conversation) {
            await Conversation.findByIdAndUpdate(conversation._id, {
                lastMessage: newMessage._id,
                $inc: { [`unreadCounts.${recipientId}`]: 1 },
                updatedAt: new Date()
            });
        }

        const io = (req as any).io;
        const messageForClient = {
            ...newMessage.toObject(),
            content: content,
            iv: undefined,
            media: newMessage.media || [],
            isRequest: conversation?.isRequest || false
        };

        if (io) {
            if (groupId) {
                io.to(groupId).emit('receive_message', messageForClient);
            } else {
                io.to(recipientId).emit('receive_message', messageForClient);
            }
        }

        res.json(messageForClient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete message - WhatsApp style
export const deleteMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { messageId } = req.params;
        const { deleteType } = req.body; // 'forMe' or 'forEveryone'

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        if (deleteType === 'forEveryone') {
            // Only sender can delete for everyone
            if (message.sender.toString() !== userId) {
                return res.status(403).json({ error: 'Only sender can delete for everyone' });
            }
            message.isDeletedForEveryone = true;
            message.content = encrypt('This message was deleted').encrypted;
            message.iv = encrypt('This message was deleted').iv;

            // Emit socket event
            const io = (req as any).io;
            if (io) {
                io.emit('message_deleted', { messageId, deleteType: 'forEveryone' });
            }
        } else {
            // Delete for me
            if (!message.deletedFor.includes(userId as any)) {
                message.deletedFor.push(userId as any);
            }
        }

        await message.save();
        res.json({ message: 'Message deleted', deleteType });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get group messages
export const getGroupMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { groupId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const messages = await Message.find({
            groupId,
            deletedFor: { $ne: userId },
            isDeletedForEveryone: false
        })
            .populate('sender', 'name avatar')
            .sort({ createdAt: 1 });

        const decryptedMessages = messages.map(msg => ({
            ...msg.toObject(),
            content: decrypt(msg.content, msg.iv),
            iv: undefined
        }));

        res.json(decryptedMessages);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Edit message - only sender can edit
export const editMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { messageId } = req.params;
        const { newContent } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!newContent || !newContent.trim()) {
            return res.status(400).json({ error: 'New content is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Only sender can edit their own message
        if (message.sender.toString() !== userId) {
            return res.status(403).json({ error: 'Only sender can edit this message' });
        }

        // Cannot edit deleted messages
        if (message.isDeletedForEveryone) {
            return res.status(400).json({ error: 'Cannot edit deleted message' });
        }

        // Encrypt the new content
        const { encrypted, iv } = encrypt(newContent);
        message.content = encrypted;
        message.iv = iv;
        (message as any).isEdited = true;
        (message as any).editedAt = new Date();

        await message.save();

        // Emit socket event for real-time update
        const io = (req as any).io;
        if (io) {
            io.emit('message_edited', {
                messageId,
                content: newContent,
                editedAt: (message as any).editedAt
            });
        }

        res.json({
            message: 'Message edited successfully',
            content: newContent,
            editedAt: (message as any).editedAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Mark single message as delivered
export const markDelivered = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { messageId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Only mark delivered if current user is recipient (i.e., not sender)
        if (message.sender.toString() === userId) {
            return res.status(400).json({ error: 'Sender cannot mark delivered' });
        }

        if (message.status === 'sent') {
            message.status = 'delivered';
            await message.save();

            // Notify sender via socket
            const io = (req as any).io;
            if (io) {
                io.to(message.sender.toString()).emit('message_delivered', { messageId: message._id.toString(), recipientId: userId });
            }
        }

        res.json({ message: 'Marked delivered' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Mark all messages in a conversation as read by current user
export const markRead = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { conversationId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Find messages that should be marked read
        const msgs = await Message.find({ conversationId, sender: { $ne: userId }, status: { $ne: 'read' } });
        if (msgs.length > 0) {
            const messageIds = msgs.map(m => m._id);
            await Message.updateMany({ _id: { $in: messageIds } }, { $set: { status: 'read' } });

            // Notify original senders via socket
            const io = (req as any).io;
            const senders = Array.from(new Set(msgs.map(m => m.sender.toString())));
            if (io) {
                senders.forEach(senderId => {
                    io.to(senderId).emit('message_read', { conversationId, readerId: userId, messageIds });
                });
            }
        }

        // Reset unread count on conversation
        await Conversation.findByIdAndUpdate(conversationId, { [`unreadCounts.${userId}`]: 0 });

        res.json({ message: 'Marked read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

