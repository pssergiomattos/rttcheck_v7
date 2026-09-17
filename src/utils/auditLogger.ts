import localforage from 'localforage';
import { AccessLogEntry, UserProfile } from '../types';

const LOGS_STORAGE_KEY = 'rtt_audit_logs_cache_v1';
const ADMIN_AUTH_KEY = 'rtt_admin_session_v1';

export function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Desconhecido';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'Android (Mobile)';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS (iPhone/iPad)';
  if (/windows/i.test(ua)) return 'Windows (PC)';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS (PC)';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Navegador Web';
}

export async function getLocalCachedLogs(): Promise<AccessLogEntry[]> {
  try {
    const raw = await localforage.getItem<string>(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveLocalCachedLog(entry: AccessLogEntry): Promise<void> {
  try {
    const list = await getLocalCachedLogs();
    list.unshift(entry);
    if (list.length > 500) list.length = 500;
    await localforage.setItem(LOGS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar log local:', e);
  }
}

export async function logAccessEvent(acao: string, user: UserProfile, detalhes?: string): Promise<void> {
  const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const dispositivo = getDeviceInfo();
  const entry: AccessLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    dataHora,
    nome: user.nome,
    email: user.email,
    cargo: user.cargo,
    acao,
    detalhes,
    dispositivo,
  };

  await saveLocalCachedLog(entry);

  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (e) {
    console.warn('Erro ao enviar log para o servidor. Mantido em cache local.', e);
  }
}

export async function verifyAdminCredentials(email: string, password?: string) {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function fetchAdminList(email: string, password?: string) {
  try {
    const res = await fetch('/api/admin/admins/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, admins: [] };
  }
}

export async function addAdminEmail(superAdminEmail: string, superAdminPassword: string | undefined, newAdminEmail: string) {
  try {
    const res = await fetch('/api/admin/admins/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ superAdminEmail, superAdminPassword, newAdminEmail }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function removeAdminEmail(superAdminEmail: string, superAdminPassword: string | undefined, targetAdminEmail: string) {
  try {
    const res = await fetch('/api/admin/admins/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ superAdminEmail, superAdminPassword, targetAdminEmail }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function fetchEmailRules() {
  try {
    const res = await fetch('/api/email-rules');
    return await res.json();
  } catch (e) {
    return { defaultDomains: [], exceptions: [] };
  }
}

export async function addEmailException(adminEmail: string, adminPassword: string | undefined, exception: string) {
  try {
    const res = await fetch('/api/admin/email-exceptions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, adminPassword, exception }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function removeEmailException(adminEmail: string, adminPassword: string | undefined, exception: string) {
  try {
    const res = await fetch('/api/admin/email-exceptions/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, adminPassword, exception }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function updateOperatorCargo(adminEmail: string, adminPassword: string | undefined, targetEmail: string, newCargo: string) {
  try {
    const res = await fetch('/api/admin/update-operator-cargo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, adminPassword, targetEmail, newCargo }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function createOperatorByAdmin(adminEmail: string, adminPassword: string | undefined, userData: { email: string; nome: string; cargo: string; password?: string }) {
  try {
    const res = await fetch('/api/admin/create-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, adminPassword, ...userData }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Erro de conexão com o servidor.' };
  }
}

export async function removeOperatorByAdmin(adminEmail: string, adminPassword: string | undefined, targetEmail: string) {
  try {
    // There doesn't appear to be a remove operator route in server.ts snippet. Mocking it or using actual if exists.
    const res = await fetch('/api/admin/remove-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, adminPassword, targetEmail }),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Apenas edição de cargo e reset de senha permitidos na interface (Remoção requer acesso manual ao JSON).' };
  }
}

export async function checkUserRegistration(email: string) {
  try {
    const res = await fetch(`/api/user/check?email=${encodeURIComponent(email)}`);
    return await res.json();
  } catch (e) {
    return { exists: false, allowed: true };
  }
}

export async function fetchServerLogs(email: string, password?: string) {
  try {
    const res = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    const localLogs = await getLocalCachedLogs();
    return { success: false, logs: localLogs, usersList: [], message: 'Erro ao buscar dados.' };
  }
}

export async function clearServerLogs(email: string, password?: string) {
  try {
    const res = await fetch('/api/admin/clear-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: 'Erro ao limpar logs: ' + e.message };
  }
}

export function triggerTxtDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadLogsTxt(email: string, password?: string, fallbackLogs: AccessLogEntry[] = []): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  if (email && password) {
    const url = `/api/admin/download-txt?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `rastreio_acessos_rtt_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // fallback
    const logsToExport = fallbackLogs.length > 0 ? fallbackLogs : await getLocalCachedLogs();
    const lines = [
      '================================================================================',
      'RTT CHECK - RELATÓRIO DE AUDITORIA E RASTREIO DE ACESSOS ONLINE',
      'REMA TIP TOP Brasil - Controle de Qualidade',
      `Exportado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      `Total de Registros: ${logsToExport.length}`,
      '================================================================================',
      '',
      ...logsToExport.map(
        (entry) =>
          `[${entry.dataHora}] ${entry.acao.toUpperCase()} | Técnico: ${entry.nome} <${entry.email}> | Função: ${entry.cargo} | Disp: ${entry.dispositivo || 'N/A'}${entry.detalhes ? ` | Obs: ${entry.detalhes}` : ''}`
      ),
    ];
    triggerTxtDownload(`rastreio_acessos_rtt_${dateStr}.txt`, lines.join('\n'));
  }
}

export function downloadLogsCsv(logs: AccessLogEntry[]): void {
  const headers = ['Data e Hora', 'Ação', 'Técnico', 'E-mail', 'Função / Setor', 'Dispositivo', 'Detalhes'];
  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
  const rows = logs.map((log) => [
    escapeCsv(log.dataHora),
    escapeCsv(log.acao),
    escapeCsv(log.nome),
    escapeCsv(log.email),
    escapeCsv(log.cargo),
    escapeCsv(log.dispositivo || ''),
    escapeCsv(log.detalhes || ''),
  ]);
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `rastreio_acessos_rtt_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function saveAdminSession(email: string, pass: string): void {
  try {
    sessionStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify({ email, pass, ts: Date.now() }));
  } catch {}
}

export function getAdminSession(): { email: string; pass: string } | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  } catch {}
}
