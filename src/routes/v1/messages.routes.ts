import { Router } from "express";
import {
  getConversations,
  getThread,
  sendMessage,
  markRead,
  getUnreadCount,
} from "../../controllers/messages.controller";
import { authenticate } from "../../middlewares/auth.middleware";

export const messagesRouter = Router();

messagesRouter.use(authenticate);

messagesRouter.get("/",                  getConversations);
messagesRouter.get("/unread-count",      getUnreadCount);
messagesRouter.get("/:peerId",           getThread);
messagesRouter.post("/",                 sendMessage);
messagesRouter.patch("/:id/read",        markRead);
