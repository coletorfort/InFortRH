import express from 'express';
import cors from 'cors';
import path from 'path';
import { db } from './db.js';

// Importar rotas
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import payslipRoutes from './routes/payslips.js';
import timeoffRoutes from './routes/timeoff.js';
import meetingRoutes from './routes/meetings.js';
import announcementRoutes from './routes/announcements.js';
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import meRoutes from './routes/me.js';
import downloadRoutes from './routes/downloads.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logs de request
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir apenas imagens de anúncios publicamente
app.use('/uploads/announcements', express.static(path.resolve('uploads/announcements')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/timeoff-requests', timeoffRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);

// Rotas "me" padronizadas
app.use('/api/me/notifications', notificationRoutes);
app.use('/api/me', meRoutes);

// Rotas de download protegidas
app.use('/api/downloads', downloadRoutes);

// Rota de teste de saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor InFort RH funcionando',
    timestamp: new Date().toISOString() 
  });
});

// Middleware de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 API disponível em: http://localhost:${PORT}/api`);
});

export default app;