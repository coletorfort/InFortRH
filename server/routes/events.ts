import { Router } from 'express';
import { db } from '../db.js';
import { events, eventParticipants, users, notifications } from '../../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação
router.use(authenticateToken);

// POST /api/events - Criar evento (apenas RH)
router.post('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { title, description, dateTime, participantIds } = req.body;

    if (!title || !description || !dateTime || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'Título, descrição, data/hora e participantes são obrigatórios' });
    }

    // Verificar se todos os participantes existem
    const participants = await db.select()
      .from(users)
      .where(inArray(users.id, participantIds));

    if (participants.length !== participantIds.length) {
      return res.status(400).json({ error: 'Um ou mais participantes não foram encontrados' });
    }

    // Criar evento
    const [newEvent] = await db.insert(events).values({
      title,
      description,
      dateTime: new Date(dateTime)
    }).returning();

    // Adicionar participantes
    const eventParticipantData = participantIds.map((userId: number) => ({
      eventId: newEvent.id,
      userId
    }));

    await db.insert(eventParticipants).values(eventParticipantData);

    // Notificar participantes
    for (const participant of participants) {
      await db.insert(notifications).values({
        userId: participant.id,
        message: `Você foi convidado para o evento: ${title}`,
        link: 'my-events',
        isRead: false
      });
    }

    res.status(201).json({
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      dateTime: newEvent.dateTime,
      participantIds,
      createdAt: newEvent.createdAt
    });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/events - Listar todos os eventos (apenas RH)
router.get('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const eventsList = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      dateTime: events.dateTime,
      createdAt: events.createdAt
    })
    .from(events)
    .orderBy(events.dateTime);

    // Para cada evento, buscar os participantes
    const eventsWithParticipants = await Promise.all(
      eventsList.map(async (event) => {
        const participants = await db.select({
          userId: eventParticipants.userId,
          userName: users.name
        })
        .from(eventParticipants)
        .innerJoin(users, eq(eventParticipants.userId, users.id))
        .where(eq(eventParticipants.eventId, event.id));

        return {
          ...event,
          participants
        };
      })
    );

    res.json(eventsWithParticipants);
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/events - Listar eventos do usuário logado
router.get('/me', async (req: AuthRequest, res) => {
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