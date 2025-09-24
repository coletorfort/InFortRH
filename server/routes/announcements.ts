import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db.js';
import { announcements } from '../../shared/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/announcements/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `announcement-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem (JPEG, PNG, GIF) são permitidos'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware de autenticação
router.use(authenticateToken);

// POST /api/announcements - Criar informativo (apenas RH)
router.post('/', requireRole(['RH']), upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { title, content } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const imageUrl = file ? `/uploads/announcements/${file.filename}` : null;

    // Criar informativo
    const [newAnnouncement] = await db.insert(announcements).values({
      title,
      content: content || null,
      imageUrl
    }).returning();

    res.status(201).json({
      id: newAnnouncement.id,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      imageUrl: newAnnouncement.imageUrl,
      createdAt: newAnnouncement.createdAt
    });
  } catch (error) {
    console.error('Erro ao criar informativo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/announcements - Listar informativos
router.get('/', async (req: AuthRequest, res) => {
  try {
    const announcementsList = await db.select()
      .from(announcements)
      .orderBy(announcements.createdAt);

    res.json(announcementsList);
  } catch (error) {
    console.error('Erro ao listar informativos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;