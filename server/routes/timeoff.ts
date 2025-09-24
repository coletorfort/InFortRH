import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db.js';
import { timeOffRequests, users, notifications } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configuração do multer para upload de atestados médicos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/medical-certificates/');
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).user?.id;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `medical-cert-${userId}-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, JPEG ou PNG são permitidos'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware de autenticação
router.use(authenticateToken);

// POST /api/timeoff-requests - Criar solicitação de folga
router.post('/', upload.single('medicalCertificate'), async (req: AuthRequest, res) => {
  try {
    const { type, startDate, endDate, justification } = req.body;
    const userId = req.user!.id;
    const file = req.file;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({ error: 'Tipo, data de início e data de fim são obrigatórios' });
    }

    const medicalCertificateUrl = file ? `/uploads/medical-certificates/${file.filename}` : null;

    // Criar solicitação
    const [newRequest] = await db.insert(timeOffRequests).values({
      userId,
      type: type as 'FERIAS' | 'LICENCA_MEDICA' | 'OUTRO',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      justification,
      medicalCertificateUrl,
      status: 'PENDENTE'
    }).returning();

    // Buscar usuário para notificação
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    // Notificar todos os usuários de RH
    const hrUsers = await db.select().from(users).where(eq(users.role, 'RH'));
    
    for (const hrUser of hrUsers) {
      await db.insert(notifications).values({
        userId: hrUser.id,
        message: `Nova solicitação de folga de ${user.name}.`,
        link: 'manage-timeoff',
        isRead: false
      });
    }

    res.status(201).json({
      id: newRequest.id,
      type: newRequest.type,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      justification: newRequest.justification,
      status: newRequest.status,
      createdAt: newRequest.createdAt
    });
  } catch (error) {
    console.error('Erro ao criar solicitação de folga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/timeoff-requests - Listar solicitações do usuário logado
router.get('/me', async (req: AuthRequest, res) => {
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

// GET /api/timeoff-requests - Listar todas as solicitações (apenas RH)
router.get('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { userId, status } = req.query;

    let query = db.select({
      id: timeOffRequests.id,
      userId: timeOffRequests.userId,
      userName: users.name,
      type: timeOffRequests.type,
      startDate: timeOffRequests.startDate,
      endDate: timeOffRequests.endDate,
      justification: timeOffRequests.justification,
      medicalCertificateUrl: timeOffRequests.medicalCertificateUrl,
      status: timeOffRequests.status,
      createdAt: timeOffRequests.createdAt
    })
    .from(timeOffRequests)
    .innerJoin(users, eq(timeOffRequests.userId, users.id));

    // Buscar com filtros aplicados depois
    let allRequests = await query.orderBy(timeOffRequests.createdAt);
    
    // Aplicar filtros em memória por simplicidade
    if (userId) {
      allRequests = allRequests.filter(req => req.userId === parseInt(userId as string));
    }
    if (status) {
      allRequests = allRequests.filter(req => req.status === status);
    }

    res.json(allRequests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/timeoff-requests/:id/status - Aprovar/negar solicitação (apenas RH)
router.put('/:id/status', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APROVADO', 'NEGADO'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser APROVADO ou NEGADO' });
    }

    // Buscar solicitação
    const [request] = await db.select()
      .from(timeOffRequests)
      .innerJoin(users, eq(timeOffRequests.userId, users.id))
      .where(eq(timeOffRequests.id, parseInt(id)));

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Atualizar status
    await db.update(timeOffRequests)
      .set({ status: status as 'APROVADO' | 'NEGADO', updatedAt: new Date() })
      .where(eq(timeOffRequests.id, parseInt(id)));

    // Notificar o funcionário
    const statusText = status === 'APROVADO' ? 'Aprovada' : 'Negada';
    const startDate = new Date(request.time_off_requests.startDate).toLocaleDateString('pt-BR');
    
    await db.insert(notifications).values({
      userId: request.time_off_requests.userId,
      message: `Sua solicitação de folga de ${startDate} foi ${statusText}.`,
      link: 'dashboard',
      isRead: false
    });

    res.json({ message: `Solicitação ${status.toLowerCase()} com sucesso.` });
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;