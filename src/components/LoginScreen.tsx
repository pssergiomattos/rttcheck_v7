import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Briefcase, ChevronDown, AlertCircle } from 'lucide-react';
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
    <div className="w-full flex flex-col h-full bg-white relative">
      <div className="flex flex-col items-center text-center mb-6 mt-4">
        <div className="w-48 h-24 flex items-center justify-center mb-2">
          <img
            src="./logo-192.png"
            alt="REMA TIP TOP"
            className="max-w-full max-h-full object-contain select-none"
          />
        </div>
        <h1 className="text-[28px] font-black text-[#800000] tracking-tight mb-1">
          RTT Check
        </h1>
        <p className="text-[13px] font-bold text-[#446688] tracking-wide uppercase">
          IDENTIFICAÇÃO DO OPERADOR
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <form onSubmit={handleSubmit} className="px-5 py-6 bg-white border border-slate-200 rounded-[14px] shadow-sm mx-1.5">
          
          {recentUsers.length > 0 && (
            <div className="mb-6 border-b border-slate-100 pb-5">
              <label className="block text-[13px] font-bold text-[#6688aa] uppercase tracking-wide mb-3">
                OPERADORES RECENTES:
              </label>
              <div className="flex gap-2 overflow-x-auto snap-x no-scrollbar">
                {recentUsers.map((user, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectRecent(user)}
                    className={`snap-start shrink-0 flex items-center gap-2 border rounded-xl py-1.5 px-3.5 transition-all ${
                      email.toLowerCase() === (user.email || '').toLowerCase()
                        ? 'border-slate-300 bg-white text-[#800000]'
                        : 'border-slate-200 text-[#113355] hover:bg-slate-50'
                    }`}
                  >
                    <User className={`w-4 h-4 ${email.toLowerCase() === (user.email || '').toLowerCase() ? 'text-[#800000]' : 'text-[#800000]'}`} />
                    <span className="text-[13px] font-bold whitespace-nowrap text-[#113355]">
                      {user.nome}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-[#113355] mb-1.5">
                E-mail Corporativo <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Informe seu e-mail corporativo"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-[10px] text-[14px] text-slate-800 font-medium focus:ring-2 focus:ring-[#8b0000] focus:border-[#8b0000] outline-none"
                  required
                />
              </div>
            </div>

            {isNewRegistration && (
              <div className="animate-fade-in space-y-4 pt-1">
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 mb-1.5">
                    Nome do Operador <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-800 focus:ring-2 focus:ring-[#8b0000] outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 mb-1.5">
                    Função / Setor <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-800 focus:ring-2 focus:ring-[#8b0000] outline-none appearance-none"
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
              <label className="block text-[13px] font-bold text-[#113355] mb-1.5">
                Senha de Acesso <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-[10px] text-[14px] text-slate-800 font-medium focus:ring-2 focus:ring-[#8b0000] outline-none"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 pt-2 pb-5">
              <input 
                type="checkbox" 
                id="manter-conectado" 
                className="w-4 h-4 text-[#0066cc] rounded border-slate-300 focus:ring-[#0066cc] cursor-pointer"
                defaultChecked
              />
              <label htmlFor="manter-conectado" className="text-sm font-bold text-[#113355] cursor-pointer select-none">
                Manter conectado neste dispositivo
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-12 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all disabled:opacity-50"
            >
              <span className="sr-only">Acessar</span>
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-[13px] font-bold leading-relaxed">
          <p className="text-[#335577]">Desenvolvido por Paulo Matos</p>
          <p className="text-[#6688aa] font-medium">Técnico de Controle de Qualidade</p>
        </div>
      </div>
    </div>
  );
};
