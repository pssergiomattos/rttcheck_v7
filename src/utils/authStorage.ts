import localforage from 'localforage';
import { UserProfile } from '../types';

const ACTIVE_USER_KEY = 'rtt_active_operator_v1';
const RECENT_USERS_KEY = 'rtt_recent_operators_v1';
const USERS_STORE_KEY = 'rtt_users_store_v1';
const ADMIN_LOGS_STORE_KEY = 'rtt_admin_logs_store_v1';

// Configure localforage to prefer IndexedDB for offline persistence
localforage.config({
  name: 'RTTCheckDB',
  storeName: 'rtt_check_data',
  description: 'Armazena os dados de operadores e senhas offline'
});

const DEFAULT_USERS: UserProfile[] = [
  { nome: 'Paulo Matos', email: 'paulo.matos@rttshop.com.br', cargo: 'Controle de Qualidade' },
];

export async function getActiveUser(): Promise<UserProfile | null> {
  try {
    const raw = await localforage.getItem<string>(ACTIVE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setActiveUser(user: UserProfile | null): Promise<void> {
  try {
    if (!user) {
      await localforage.removeItem(ACTIVE_USER_KEY);
    } else {
      await localforage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      await saveUserToHistory(user);
    }
  } catch (e) {
    console.warn('Erro ao salvar operador:', e);
  }
}

export async function getRecentUsers(): Promise<UserProfile[]> {
  try {
    const raw = await localforage.getItem<string>(RECENT_USERS_KEY);
    if (!raw) return [];
    
    const list: UserProfile[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return [];
    
    return list;
  } catch {
    return [];
  }
}

export async function saveUserToHistory(user: UserProfile): Promise<void> {
  try {
    const list = await getRecentUsers();
    // Evita duplicatas pelo nome
    const filtered = list.filter((u) => u.nome.trim().toLowerCase() !== user.nome.trim().toLowerCase());
    const updated = [user, ...filtered].slice(0, 5); // guarda até 5 recentes
    await localforage.setItem(RECENT_USERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar histórico de operadores:', e);
  }
}
