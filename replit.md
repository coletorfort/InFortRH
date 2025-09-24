# InFort RH - Human Resources Management System

## Overview
InFort RH é um sistema completo de gestão de Recursos Humanos com arquitetura full-stack, incluindo frontend React e backend API RESTful. O sistema oferece funcionalidades completas para gestão de funcionários, contracheques, solicitações de folga, agendamento de reuniões e comunicação interna.

## Recent Changes
- **2024-09-24**: Implementação completa do backend API RESTful
- Conectado banco PostgreSQL com esquema completo
- Implementados todos os módulos conforme especificação
- Sistema de autenticação JWT implementado
- Upload e download de arquivos protegidos
- Criados usuários iniciais para teste

## Project Architecture

### Frontend
- **Framework**: React 19 com TypeScript
- **Build Tool**: Vite 6.3.6
- **Styling**: TailwindCSS (via CDN)
- **Port**: 5000 (configured for Replit environment)
- **Host**: 0.0.0.0 (allows external access through Replit proxy)

### Backend API
- **Framework**: Express.js com TypeScript
- **Port**: 3001 (backend API)
- **Database**: PostgreSQL com Drizzle ORM
- **Authentication**: JWT com middleware de autorização
- **File Uploads**: Multer com validação de tipos
- **Security**: CORS habilitado, uploads protegidos

## API Endpoints Implementados

### Autenticação (/api/auth)
- `POST /login` - Login de usuário
- `POST /setup-password` - Configuração inicial de senha

### Usuários (/api/users) - Apenas RH
- `POST /` - Cadastrar funcionário
- `GET /` - Listar funcionários (com filtros)
- `PUT /:id/status` - Ativar/desativar funcionário
- `POST /:id/reset-password` - Resetar senha

### Contracheques (/api/payslips)
- `POST /` - Upload de contracheque (RH)
- `GET /me` - Listar meus contracheques
- `GET /api/downloads/payslip/:id` - Download protegido

### Folgas (/api/timeoff-requests)
- `POST /` - Solicitar folga (com upload atestado)
- `GET /me` - Minhas solicitações
- `GET /` - Todas solicitações (RH)
- `PUT /:id/status` - Aprovar/negar (RH)

### Reuniões (/api/meetings)
- `POST /` - Solicitar reunião
- `GET /` - Todas solicitações (RH)
- `PUT /:id/status` - Aprovar/negar (RH)

### Informativos (/api/announcements)
- `POST /` - Publicar informativo (RH)
- `GET /` - Listar informativos

### Eventos (/api/events)
- `POST /` - Criar evento (RH)
- `GET /` - Todos eventos (RH)
- `GET /me/events` - Meus eventos

### Notificações (/api/me/notifications)
- `GET /` - Minhas notificações
- `POST /mark-as-read` - Marcar como lidas
- `GET /unread-count` - Contar não lidas

## Database Schema
- **users**: Funcionários e RH com autenticação
- **payslips**: Contracheques por funcionário/mês
- **time_off_requests**: Solicitações de folga
- **meeting_requests**: Solicitações de reunião
- **announcements**: Informativos da empresa
- **events**: Eventos corporativos
- **event_participants**: Participantes dos eventos
- **notifications**: Notificações do sistema

## Security Features
- JWT com middleware de autenticação
- Controle de acesso baseado em roles (FUNCIONARIO/RH)
- Upload de arquivos com validação de tipo/tamanho
- Downloads protegidos por autenticação e ownership
- Senhas hasheadas com bcrypt

## Usuários de Teste Criados
- **Funcionário**: ana@email.com / password
- **Funcionário**: beatriz@email.com / password  
- **RH**: carlos@email.com / password
- **Admin RH**: admin@email.com / admin123

## Problemas Conhecidos (Para Resolução)

### Banco de Dados Externo
- **Status**: ❌ Não conectado
- **Hostname**: fmarechal.com (resolve para 216.172.172.73)
- **Problema**: ECONNREFUSED na porta 5432
- **Solução Temporária**: Usando banco PostgreSQL local do Replit
- **Próximos Passos**: Verificar firewall, SSL, whitelist de IPs

### Segurança (CRÍTICO para Produção)
- **JWT_SECRET**: Usando chave temporária - DEVE ser configurado
- **Credenciais**: Hardcoded no código - DEVEM ser movidas para variáveis de ambiente
- **CORS**: Aberto para todos - DEVE ser restrito às origens confiáveis

## Development Commands
- `npm run dev` - Frontend (port 5000)
- `npm run server:dev` - Backend API (port 3001)  
- `npm run db:push` - Aplicar mudanças no schema
- `npm run db:studio` - Interface visual do banco

## Deployment Configuration
- **Frontend**: Autoscale deployment
- **Backend**: Requer configuração de variáveis de ambiente seguras
- **Status**: ⚠️ Requer correções de segurança antes de produção

## Next Steps Para Produção
1. **Configurar variáveis de ambiente seguras** (JWT_SECRET, DB credentials)
2. **Resolver conectividade com banco PostgreSQL externo**
3. **Implementar rate limiting nos endpoints de auth**
4. **Configurar CORS para origens específicas**
5. **Teste end-to-end completo de todos os módulos**

## User Preferences
- Responder sempre em português
- Manter estrutura do backend conforme especificação fornecida
- Usar PostgreSQL como banco de dados principal