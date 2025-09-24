import React, { useState, useMemo } from 'react';
import { User, Role } from '../../types';
import ConfirmationDialog from '../shared/ConfirmationDialog';

interface ManageEmployeesProps {
  users: User[];
  onUpdateStatus: (userId: number, status: 'ATIVO' | 'INATIVO') => void;
  onResetPassword: (userId: number) => void;
}

const getStatusColor = (status: 'ATIVO' | 'INATIVO') => {
    return status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800';
};

const ManageEmployees: React.FC<ManageEmployeesProps> = ({ users, onUpdateStatus, onResetPassword }) => {
  const [filter, setFilter] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState({ title: '', message: '', confirmText: '' });

  const handleStatusUpdateClick = (userId: number, currentStatus: 'ATIVO' | 'INATIVO') => {
    const newStatus = currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    setConfirmationDetails({
        title: `${newStatus === 'ATIVO' ? 'Reativar' : 'Desativar'} Funcionário`,
        message: `Tem certeza que deseja ${newStatus === 'ATIVO' ? 'reativar' : 'desativar'} este funcionário?`,
        confirmText: `Sim, ${newStatus === 'ATIVO' ? 'Reativar' : 'Desativar'}`
    });
    setConfirmationAction(() => () => onUpdateStatus(userId, newStatus));
    setIsConfirmOpen(true);
  };

  const handleResetPasswordClick = (userId: number) => {
    setConfirmationDetails({
        title: 'Resetar Senha',
        message: 'Tem certeza que deseja resetar a senha deste funcionário? O usuário precisará criar uma nova senha no próximo login.',
        confirmText: 'Sim, Resetar'
    });
    setConfirmationAction(() => () => onResetPassword(userId));
    setIsConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (confirmationAction) {
      confirmationAction();
    }
    handleCancel();
  };

  const handleCancel = () => {
    setIsConfirmOpen(false);
    setConfirmationAction(null);
  };

  const filteredUsers = useMemo(() => {
    const employees = users.filter(u => u.role === Role.FUNCIONARIO);
    if (!filter) {
      return employees;
    }
    return employees.filter(
      user =>
        user.name.toLowerCase().includes(filter.toLowerCase()) ||
        user.email.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Funcionários</h2>
          <div className="mt-4 sm:mt-0">
            <input
              type="text"
              placeholder="Filtrar por nome ou email..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="block w-full sm:w-64 pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm rounded-md"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => handleResetPasswordClick(user.id)} className="text-slate-600 hover:text-slate-900 transition-colors">Resetar Senha</button>
                    <button
                      onClick={() => handleStatusUpdateClick(user.id, user.status)}
                      className={`${user.status === 'ATIVO' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} transition-colors`}
                    >
                      {user.status === 'ATIVO' ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              Nenhum funcionário encontrado.
            </div>
          )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        title={confirmationDetails.title}
        message={confirmationDetails.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={confirmationDetails.confirmText}
        cancelText="Cancelar"
      />
    </>
  );
};

export default ManageEmployees;