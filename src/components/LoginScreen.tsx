import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  ArrowRight,
  UserCheck,
  Briefcase,
  ChevronDown,
  Lock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, CARGOS_DISPONIVEIS } from '../types';
import { getRecentUsers, setActiveUser } from '../utils/authStorage';
import { logAccessEvent, fetchEmailRules, checkUserRegistration } from '../utils/auditLogger';

export function extractNameFromEmail(emailStr: string): string {
  if (!emailStr) return '';
  const userPart = emailStr.trim().split('@')[0];
  if (!userPart) return '';
  const words = userPart
    .replace(/[0-9]/g, '')
    .split(/[\.\_\-]+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (words.length === 0) return '';

  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && preposicoes.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState<string>('Controle de Qualidade');
  const [lembrar, setLembrar] = useState(true);

  const [recentUsers] = useState<UserProfile[]>(() => getRecentUsers());
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [defaultDomains, setDefaultDomains] = useState<string[]>(['@rttshop.com.br', '@rematiptop.com.br']);
  const [emailExceptions, setEmailExceptions] = useState<string[]>([]);
  
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  const [emailNotice, setEmailNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const checkTimerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    fetchEmailRules().then((rules) => {
      if (mounted) {
        if (rules.defaultDomains?.length) setDefaultDomains(rules.defaultDomains);
        if (rules.exceptions) setEmailExceptions(rules.exceptions);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const checkEmailAllowed = (cleanEmail: string): { allowed: boolean; isException: boolean } => {
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { allowed: false, isException: false };
    }
    for (const dom of defaultDomains) {
      if (cleanEmail.endsWith(dom)) {
        return { allowed: true, isException: false };
      }
    }
    for (const exc of emailExceptions) {
      if (exc.startsWith('@')) {
        if (cleanEmail.endsWith(exc)) {
          return { allowed: true, isException: true };
        }
      } else if (cleanEmail === exc) {
        return { allowed: true, isException: true };
      }
    }
    return { allowed: false, isException: false };
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setPassword('');
    if (errorMsg) setErrorMsg('');

    const clean = val.trim().toLowerCase();
    const extracted = extractNameFromEmail(clean);
    setNome(extracted);

    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setEmailNotice(null);
      setIsExistingUser(false);
      setIsNewRegistration(false);
      return;
    }

    const { allowed, isException } = checkEmailAllowed(clean);

    if (!allowed) {
      setEmailNotice({
        type: 'error',
        text: 'Acesso restrito para este e-mail. Caso necessite de liberação, solicite ao Administrador.',
      });
      setIsExistingUser(false);
      setIsNewRegistration(false);
      return;
    }

    if (isException) {
      setEmailNotice({
        type: 'info',
        text: 'E-mail com exceção autorizada pelo Administrador.',
      });
    } else {
      setEmailNotice({
        type: 'success',
        text: 'E-mail corporativo válido.',
      });
    }

    setCheckingUser(true);
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkUserRegistration(clean);
        if (res.exists) {
          setIsExistingUser(true);
          setIsNewRegistration(false);
          if (res.nome) setNome(res.nome);
          if (res.cargo) setCargo(res.cargo);
        } else {
          if (clean === 'paulo.matos@rttshop.com.br') {
            setIsExistingUser(true);
            setIsNewRegistration(false);
            setNome('Paulo Matos');
            setCargo('Administrador do Sistema');
          } else {
            setIsExistingUser(false);
            setIsNewRegistration(true);
          }
        }
      } catch (err) {
        setIsExistingUser(false);
        setIsNewRegistration(true);
      } finally {
        setCheckingUser(false);
      }
    }, 600);
  };

  const handleSelectRecent = async (user: UserProfile) => {
    if (user.email) {
      const clean = user.email.trim().toLowerCase();
      setEmail(clean);
      const extracted = extractNameFromEmail(clean);
      setNome(user.nome || extracted);
      
      const { allowed, isException } = checkEmailAllowed(clean);
      if (!allowed) {
        setEmailNotice({ type: 'error', text: 'Acesso restrito para este e-mail corporativo.' });
      } else if (isException) {
        setEmailNotice({ type: 'info', text: 'E-mail com exceção autorizada pelo Administrador.' });
      } else {
        setEmailNotice({ type: 'success', text: 'E-mail corporativo válido.' });
      }

      setCheckingUser(true);
      try {
        const res = await checkUserRegistration(clean);
        if (res.exists) {
          setIsExistingUser(true);
          setIsNewRegistration(false);
          if (res.nome) setNome(res.nome);
          if (res.cargo) setCargo(res.cargo);
        } else {
           if (clean === 'paulo.matos@rttshop.com.br') {
            setIsExistingUser(true);
            setIsNewRegistration(false);
            setNome('Paulo Matos');
            setCargo('Administrador do Sistema');
          } else {
            setIsExistingUser(false);
            setIsNewRegistration(true);
            if (user.cargo) setCargo(user.cargo);
          }
        }
      } catch {
        setIsExistingUser(true);
        setIsNewRegistration(false);
        if (user.cargo) setCargo(user.cargo);
      } finally {
        setCheckingUser(false);
      }
    } else {
      setNome(user.nome);
      if (user.cargo) setCargo(user.cargo);
      setIsExistingUser(true);
      setIsNewRegistration(false);
    }
    setErrorMsg('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha o e-mail e a senha.');
      return;
    }

    if (isNewRegistration && !nome.trim()) {
      setErrorMsg('Preencha seu nome completo para o primeiro acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        email: email.trim(),
        nome: nome.trim(),
        cargo: cargo.trim(),
        password: password.trim(),
      };

      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        logAccessEvent('LOGIN FALHA', { nome, email, cargo }, `Tentativa de acesso negada: ${data.message}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailAllowedStatus = emailNotice?.type === 'success' || emailNotice?.type === 'info';

  return (
    <div className="w-full flex flex-col h-full bg-white relative">
      <div className="flex flex-col items-center mb-6 mt-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[#8b0000] to-red-900 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 mb-4 border border-red-800">
          <UserCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">
          RTT <span className="text-[#8b0000]">CHECK</span>
        </h1>
        <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-widest">
          Controle de Qualidade
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-1 pb-4">
        {recentUsers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Acessos Recentes
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x no-scrollbar">
              {recentUsers.map((user, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectRecent(user)}
                  className={`snap-start shrink-0 w-32 bg-slate-50 border-2 rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:bg-slate-100 ${
                    email.toLowerCase() === (user.email || '').toLowerCase()
                      ? 'border-[#8b0000] shadow-sm bg-red-50/50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#8b0000] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                    {user.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-full text-center">
                    <p className="text-xs font-bold text-slate-700 truncate w-full">
                      {user.nome.split(' ')[0]}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate w-full font-medium mt-0.5">
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700 font-medium flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {emailNotice && (
            <div
              className={`p-3 rounded-xl text-[13px] font-medium flex items-start gap-2 animate-fade-in ${
                emailNotice.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : emailNotice.type === 'info'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {emailNotice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : emailNotice.type === 'info' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{emailNotice.text}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="input-login-email" className="block text-xs font-bold text-slate-700 mb-1">
                E-mail Corporativo <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="ex: joao.silva@rttshop.com.br"
                  className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-lg text-sm text-slate-800 font-bold focus:ring-2 focus:ring-[#8b0000] outline-none transition-colors ${
                    emailNotice?.type === 'error' ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-[#8b0000]'
                  }`}
                  required
                />
                {checkingUser && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#8b0000] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {isNewRegistration && isEmailAllowedStatus && (
              <div className="animate-fade-in p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3 mt-2">
                <p className="text-xs text-blue-800 font-medium text-center">
                  ✨ Primeiro acesso detectado! Complete seus dados profissionais.
                </p>

                <div>
                  <label htmlFor="input-login-nome" className="block text-[11px] font-bold text-blue-900 mb-1">
                    Nome Completo <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-login-nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="select-login-cargo" className="block text-[11px] font-bold text-blue-900 mb-1">
                    Função / Setor <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="select-login-cargo"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    >
                      {CARGOS_DISPONIVEIS.map((opcao) => (
                        <option key={opcao} value={opcao}>
                          {opcao}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-blue-700 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <div className={`transition-all duration-300 ${(!email || !isEmailAllowedStatus) ? 'opacity-50 pointer-events-none' : ''}`}>
              <label htmlFor="input-login-password" className="block text-xs font-bold text-slate-700 mb-1">
                {isNewRegistration ? 'Crie uma Senha de Acesso ' : 'Senha de Acesso '}
                <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isNewRegistration ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-bold focus:ring-2 focus:ring-[#8b0000] focus:border-[#8b0000] outline-none transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim() || !isEmailAllowedStatus}
              className={`w-full py-3.5 px-4 text-white font-bold text-sm tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-150 ${
                loading || !email.trim() || !password.trim() || !isEmailAllowedStatus
                  ? 'bg-slate-400 cursor-not-allowed opacity-75'
                  : 'bg-[#8b0000] hover:bg-[#720000] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span>VERIFICANDO...</span>
              ) : (
                <>
                  <span>{isNewRegistration ? 'CADASTRAR E ACESSAR' : 'ACESSAR SISTEMA'}</span>
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
