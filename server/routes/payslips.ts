import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db.js';
import { payslips, users } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payslips/');
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).body.userId;
    const month = (req as AuthRequest).body.month;
    const year = (req as AuthRequest).body.year;
    const extension = path.extname(file.originalname);
    const filename = `payslip-${userId}-${year}-${month.toString().padStart(2, '0')}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware de autenticação
router.use(authenticateToken);

// POST /api/payslips - Upload de contracheque (apenas RH)
router.post('/', requireRole(['RH']), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { userId, month, year } = req.body;
    const file = req.file;

    if (!userId || !month || !year || !file) {
      return res.status(400).json({ error: 'UserId, mês, ano e arquivo são obrigatórios' });
    }

    // Verificar se usuário existe
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já existe contracheque para este período
    const [existing] = await db.select()
      .from(payslips)
      .where(and(
        eq(payslips.userId, parseInt(userId)),
        eq(payslips.month, parseInt(month)),
        eq(payslips.year, parseInt(year))
      ));

    if (existing) {
      return res.status(400).json({ error: 'Já existe um contracheque para este período' });
    }

    // Criar registro do contracheque
    const [newPayslip] = await db.insert(payslips).values({
      userId: parseInt(userId),
      month: parseInt(month),
      year: parseInt(year),
      fileUrl: `/uploads/payslips/${file.filename}`
    }).returning();

    res.status(201).json({
      id: newPayslip.id,
      userId: newPayslip.userId,
      month: newPayslip.month,
      year: newPayslip.year,
      fileUrl: newPayslip.fileUrl,
      createdAt: newPayslip.createdAt
    });
  } catch (error) {
    console.error('Erro ao fazer upload do contracheque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/me/payslips - Listar contracheques do usuário logado
router.get('/me', async (req: AuthRequest, res) => {
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

// GET /api/payslips/:id/download - Download do contracheque
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Buscar contracheque
    const [payslip] = await db.select()
      .from(payslips)
      .where(eq(payslips.id, parseInt(id)));

    if (!payslip) {
      return res.status(404).json({ error: 'Contracheque não encontrado' });
    }

    // Verificar permissão (usuário só pode baixar seus próprios contracheques, RH pode baixar todos)
    if (userRole !== 'RH' && payslip.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Enviar arquivo
    const filePath = path.join(process.cwd(), payslip.fileUrl);
    res.download(filePath, `contracheque-${payslip.year}-${payslip.month.toString().padStart(2, '0')}.pdf`);
  } catch (error) {
    console.error('Erro ao fazer download do contracheque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;