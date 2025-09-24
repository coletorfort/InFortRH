import { Router } from 'express';
import { db } from '../db.js';
import { payslips, timeOffRequests, events, eventParticipants, users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/me/payslips - Listar contracheques do usuário logado  
router.get('/payslips', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userPayslips = await db.select({
      id: payslips.id,
      month: payslips.month,
      year: payslips.year,
      fileUrl: payslips.fileUrl,
      createdAt: payslips.createdAt
    })
    .from(payslips)
    .where(eq(payslips.userId, userId))
    .orderBy(payslips.year, payslips.month);

    res.json(userPayslips);
  } catch (error) {
    console.error('Erro ao listar contracheques:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/timeoff-requests - Listar solicitações do usuário logado
router.get('/timeoff-requests', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userRequests = await db.select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.userId, userId))
      .orderBy(timeOffRequests.createdAt);

    res.json(userRequests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/events - Listar eventos do usuário logado
router.get('/events', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userEvents = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      dateTime: events.dateTime,
      createdAt: events.createdAt
    })
    .from(events)
    .innerJoin(eventParticipants, eq(events.id, eventParticipants.eventId))
    .where(eq(eventParticipants.userId, userId))
    .orderBy(events.dateTime);

    res.json(userEvents);
  } catch (error) {
    console.error('Erro ao listar eventos do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;