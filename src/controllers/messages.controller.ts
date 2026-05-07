import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/** GET /messages — all conversations (latest message per peer) */
export async function getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;

    // Fetch all messages involving this user
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender:   { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Deduplicate by peer — keep only the latest message per conversation
    const seen = new Set<string>();
    const conversations = messages.filter((m) => {
      const peerId = m.senderId === userId ? m.receiverId : m.senderId;
      if (seen.has(peerId)) return false;
      seen.add(peerId);
      return true;
    });

    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
}

/** GET /messages/:peerId — full message thread with a specific user */
export async function getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;
    const { peerId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: String(peerId) },
          { senderId: String(peerId), receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { senderId: String(peerId), receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
}

/** POST /messages — send a message */
export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const senderId = req.userId!;
    const { receiverId, content, listingId } = req.body;

    if (!receiverId || !content?.trim()) {
      res.status(400).json({ error: "receiverId and content are required" });
      return;
    }

    if (receiverId === senderId) {
      res.status(400).json({ error: "Cannot send a message to yourself" });
      return;
    }

    const receiver = await prisma.user.findUnique({ where: { id: String(receiverId) } });
    if (!receiver) { res.status(404).json({ error: "Recipient not found" }); return; }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: String(receiverId),
        content: String(content).trim(),
        listingId: listingId ? String(listingId) : null,
      },
      include: {
        sender:   { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

/** PATCH /messages/:id/read — mark a message as read */
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const message = await prisma.message.findUnique({ where: { id: String(id) } });
    if (!message) { res.status(404).json({ error: "Message not found" }); return; }
    if (message.receiverId !== req.userId) { res.status(403).json({ error: "Not your message" }); return; }

    const updated = await prisma.message.update({
      where: { id: String(id) },
      data: { isRead: true },
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

/** GET /messages/unread-count */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.userId!, isRead: false },
    });
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
}
