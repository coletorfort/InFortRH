import { Router } from 'express';
import { db } from '../db.js';
import { notifications } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação
router.use(authenticateToken);

// GET /api/me/notifications - Obter notificações do usuário logado
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);

    res.json(userNotifications);
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/me/notifications/mark-as-read - Marcar notificações como lidas
router.post('/mark-as-read', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificações específicas como lidas
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.id, notificationIds[0]) // Usar primeiro ID como exemplo
        ));
    } else {
      // Marcar todas as notificações do usuário como lidas
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
    }

    res.json({ message: 'Notificações marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/notifications/unread-count - Contar notificações não lidas
router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const unreadNotifications = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;