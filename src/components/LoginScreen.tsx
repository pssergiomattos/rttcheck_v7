import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, User, Briefcase, ChevronDown, AlertCircle } from 'lucide-react';
import { UserProfile, CARGOS_DISPONIVEIS } from '../types';
import { getRecentUsers, setActiveUser } from '../utils/authStorage';
import { logAccessEvent, checkUserRegistration } from '../utils/auditLogger';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState<string>('Controle de Qualidade');
  
  const [recentUsers] = useState<UserProfile[]>(() => getRecentUsers());
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isNewRegistration, setIsNewRegistration] = useState(false);

  // Auto-detect if user needs registration
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    
    if (isValidFormat) {
      const timer = setTimeout(async () => {
        try {
          const res = await checkUserRegistration(cleanEmail);
          if (res.exists) {
            setIsNewRegistration(false);
          } else {
            setIsNewRegistration(true);
            // Suggest name from email
            const userPart = cleanEmail.split('@')[0];
            const words = userPart.replace(/[0-9]/g, '').split(/[\.\_\-]+/).filter(Boolean);
            const suggested = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (suggested && !nome) setNome(suggested);
          }
        } catch (e) {}
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsNewRegistration(false);
    }
  }, [email]);

  const handleSelectRecent = (user: UserProfile) => {
    setEmail(user.email || '');
    setNome(user.nome || '');
    if (user.cargo) setCargo(user.cargo);
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha o e-mail e a senha.');
      return;
    }
    
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!isValidFormat) {
      setErrorMsg('Informe um formato de e-mail válido (ex: nome@empresa.com.br).');
      return;
    }
    
    if (isNewRegistration && !nome.trim()) {
      setErrorMsg('Preencha o nome do técnico para o primeiro acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          nome: nome.trim(),
          cargo: cargo.trim()
        }),
      });
      const data = await res.json();

      if (data.success) {
        const userToSave: UserProfile = {
          email: data.user.email,
          nome: data.user.nome,
          cargo: data.user.cargo,
        };
        setActiveUser(userToSave);
        if (!data.isNew) {
          logAccessEvent('LOGIN SUCESSO', userToSave, 'Acesso autenticado ao aplicativo');
        }
        onLoginSuccess(userToSave);
      } else {
        setErrorMsg(data.message || 'Erro ao autenticar.');
        logAccessEvent('LOGIN FALHA', { nome: email, email, cargo: 'Desconhecido' }, `Tentativa de acesso negada: ${data.message}`);
      }
    } catch (err) {
      setErrorMsg('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-white relative pt-2 pb-2">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-44 h-24 flex items-center justify-center mb-1">
          <img
            src="./logo-192.png"
            alt="REMA TIP TOP"
            className="max-w-full max-h-full object-contain select-none"
          />
        </div>
        <h1 className="text-3xl font-black text-[#8b0000] tracking-tight mb-0.5">
          RTT Check
        </h1>
        <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">
          Controle de Qualidade
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {recentUsers.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
              Acessos Recentes
            </h3>
            <div className="flex flex-col gap-2 px-1">
              {recentUsers.map((user, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectRecent(user)}
                  className={`w-full bg-slate-50 border rounded-lg p-2.5 flex items-center gap-3 transition-all hover:bg-slate-100 ${
                    email.toLowerCase() === (user.email || '').toLowerCase()
                      ? 'border-[#8b0000] shadow-sm bg-red-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#8b0000] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                    {user.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-bold text-slate-700 truncate">
                      {user.nome}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-medium mt-0.5">
                      {user.cargo}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-mail Corporativo <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail da empresa"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-[#8b0000] outline-none"
                  required
                />
              </div>
            </div>

            {isNewRegistration && (
              <div className="animate-fade-in p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2">
                <p className="text-xs text-slate-600 font-medium text-center">
                  Primeiro acesso detectado. Preencha seus dados:
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Completo <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#8b0000] outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Função / Setor <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#8b0000] outline-none appearance-none"
                    >
                      {CARGOS_DISPONIVEIS.map((opcao) => (
                        <option key={opcao} value={opcao}>{opcao}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha de Acesso <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-[#8b0000] outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3.5 px-4 bg-[#8b0000] hover:bg-[#720000] active:scale-[0.98] text-white font-bold text-sm tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <span>AGUARDE...</span>
              ) : (
                <>
                  <span>ACESSAR SISTEMA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
