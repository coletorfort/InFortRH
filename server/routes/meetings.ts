import { Router } from 'express';
import { db } from '../db.js';
import { meetingRequests, users, notifications } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação
router.use(authenticateToken);

// POST /api/meetings - Criar solicitação de reunião
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { topic, preferredDateTime } = req.body;
    const userId = req.user!.id;

    if (!topic || !preferredDateTime) {
      return res.status(400).json({ error: 'Tópico e data/hora preferencial são obrigatórios' });
    }

    // Criar solicitação
    const [newRequest] = await db.insert(meetingRequests).values({
      userId,
      topic,
      preferredDateTime: new Date(preferredDateTime),
      status: 'PENDENTE'
    }).returning();

    // Buscar usuário para notificação
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    // Notificar todos os usuários de RH
    const hrUsers = await db.select().from(users).where(eq(users.role, 'RH'));
    
    for (const hrUser of hrUsers) {
      await db.insert(notifications).values({
        userId: hrUser.id,
        message: `Nova solicitação de reunião de ${user.name}.`,
        link: 'manage-meetings',
        isRead: false
      });
    }

    res.status(201).json({
      id: newRequest.id,
      topic: newRequest.topic,
      preferredDateTime: newRequest.preferredDateTime,
      status: newRequest.status,
      createdAt: newRequest.createdAt
    });
  } catch (error) {
    console.error('Erro ao criar solicitação de reunião:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/meetings - Listar todas as solicitações (apenas RH)
router.get('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { userId, status } = req.query;

    let query = db.select({
      id: meetingRequests.id,
      userId: meetingRequests.userId,
      userName: users.name,
      topic: meetingRequests.topic,
      preferredDateTime: meetingRequests.preferredDateTime,
      status: meetingRequests.status,
      createdAt: meetingRequests.createdAt
    })
    .from(meetingRequests)
    .innerJoin(users, eq(meetingRequests.userId, users.id));

    // Buscar todos e filtrar em memória
    let requests = await query.orderBy(meetingRequests.createdAt);
    
    // Aplicar filtros
    if (userId) {
      requests = requests.filter(req => req.userId === parseInt(userId as string));
    }
    if (status) {
      requests = requests.filter(req => req.status === status);
    }

    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações de reunião:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/meetings/:id/status - Aprovar/negar solicitação (apenas RH)
router.put('/:id/status', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APROVADO', 'NEGADO'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser APROVADO ou NEGADO' });
    }

    // Buscar solicitação
    const [request] = await db.select()
      .from(meetingRequests)
      .where(eq(meetingRequests.id, parseInt(id)));

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Atualizar status
    await db.update(meetingRequests)
      .set({ status: status as 'APROVADO' | 'NEGADO', updatedAt: new Date() })
      .where(eq(meetingRequests.id, parseInt(id)));

    // Notificar o funcionário
    const statusText = status === 'APROVADO' ? 'Aprovada' : 'Negada';
    
    await db.insert(notifications).values({
      userId: request.userId,
      message: `Sua reunião sobre "${request.topic}" foi ${statusText}.`,
      link: 'dashboard',
      isRead: false
    });

    res.json({ message: `Agendamento ${status.toLowerCase()} com sucesso.` });
  } catch (error) {
    console.error('Erro ao atualizar status da reunião:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;