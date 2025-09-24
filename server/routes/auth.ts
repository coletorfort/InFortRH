import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    if (user.status !== 'ATIVO') {
      return res.status(401).json({ error: 'Sua conta está desativada. Entre em contato com o RH.' });
    }

    // Verificar se precisa configurar senha
    if (user.needsPasswordSetup) {
      return res.status(200).json({ 
        needsPasswordSetup: true,
        userId: user.id,
        email: user.email 
      });
    }

    // Verificar senha
    if (!user.password || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/setup-password
router.post('/setup-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email e nova senha são obrigatórios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user || !user.needsPasswordSetup) {
      return res.status(400).json({ error: 'Usuário não encontrado ou não necessita configurar senha' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar usuário
    await db.update(users)
      .set({ 
        password: hashedPassword,
        needsPasswordSetup: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Gerar token
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao configurar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;