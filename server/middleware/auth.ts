import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'infort-rh-secure-' + Date.now();

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não configurado. Usando chave temporária para desenvolvimento.');
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'FUNCIONARIO' | 'RH';
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Buscar usuário no banco
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    
    if (!user || user.status !== 'ATIVO') {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};