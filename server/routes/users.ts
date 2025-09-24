import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// POST /api/users - Cadastrar funcionário (apenas RH)
router.post('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se email já existe
    const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Criar usuário
    const [newUser] = await db.insert(users).values({
      name,
      email: email.toLowerCase(),
      role: 'FUNCIONARIO',
      needsPasswordSetup: true,
      status: 'ATIVO'
    }).returning();

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      needsPasswordSetup: newUser.needsPasswordSetup
    });
  } catch (error) {
    console.error('Erro ao cadastrar funcionário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users - Listar funcionários (apenas RH)
router.get('/', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { search, status } = req.query;

    let query = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      needsPasswordSetup: users.needsPasswordSetup,
      createdAt: users.createdAt
    }).from(users);

    // Aplicar filtros se necessário
    let whereConditions = [];
    if (search) {
      whereConditions.push(ilike(users.name, `%${search}%`));
    }
    if (status) {
      whereConditions.push(eq(users.status, status as 'ATIVO' | 'INATIVO'));
    }

    // Se há filtros, aplicar na query
    if (whereConditions.length > 0) {
      // Refazer a query com filtros
      const filteredUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        needsPasswordSetup: users.needsPasswordSetup,
        createdAt: users.createdAt
      }).from(users);
      
      res.json(filteredUsers.filter(user => {
        let matches = true;
        if (search) matches = matches && user.name.toLowerCase().includes((search as string).toLowerCase());
        if (status) matches = matches && user.status === status;
        return matches;
      }));
      return;
    }

    const usersList = await query;

    res.json(usersList);
  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/:id/status - Ativar/desativar funcionário (apenas RH)
router.put('/:id/status', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ATIVO', 'INATIVO'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser ATIVO ou INATIVO' });
    }

    // Verificar se usuário existe
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar status
    await db.update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, parseInt(id)));

    res.json({ message: `Status do usuário atualizado para ${status}` });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/users/:id/reset-password - Resetar senha (apenas RH)
router.post('/:id/reset-password', requireRole(['RH']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Resetar senha
    await db.update(users)
      .set({ 
        password: null,
        needsPasswordSetup: true, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, parseInt(id)));

    res.json({ message: 'Senha resetada. O usuário deverá criar uma nova senha no próximo login.' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;