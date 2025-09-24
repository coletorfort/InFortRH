import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';
import { payslips, timeOffRequests } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/downloads/payslip/:id - Download seguro de contracheque
router.get('/payslip/:id', async (req: AuthRequest, res) => {
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

    // Caminho do arquivo
    const filePath = path.resolve(payslip.fileUrl.substring(1)); // Remove "/" inicial
    
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Nome do arquivo para download
    const filename = `contracheque-${payslip.year}-${payslip.month.toString().padStart(2, '0')}.pdf`;
    
    // Configurar headers de download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    
    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro ao fazer download do contracheque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/downloads/medical-certificate/:id - Download seguro de atestado médico
router.get('/medical-certificate/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Buscar solicitação de folga com atestado
    const [request] = await db.select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.id, parseInt(id)));

    if (!request || !request.medicalCertificateUrl) {
      return res.status(404).json({ error: 'Atestado médico não encontrado' });
    }

    // Verificar permissão (usuário só pode baixar seus próprios atestados, RH pode baixar todos)
    if (userRole !== 'RH' && request.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Caminho do arquivo
    const filePath = path.resolve(request.medicalCertificateUrl.substring(1)); // Remove "/" inicial
    
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Nome do arquivo para download
    const filename = `atestado-medico-${request.id}.${path.extname(filePath).substring(1)}`;
    
    // Configurar headers de download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro ao fazer download do atestado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;