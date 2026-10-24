import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SPECIALISTS, Specialist } from '../services/specialist-registry'

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
  timestamp: number;
  files?: any[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface BvmbinoState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  activeSpecialist: Specialist | null;
  isBuilderMode: boolean;
  isWebSearchEnabled: boolean;
  isMemoryEnabled: boolean;
  vaultKey: string | null;
  
  // Actions
  addMessage: (content: string, role: Message['role'], files?: any[]) => void;
  setCurrentSession: (id: string | null) => void;
  createNewSession: () => void;
  deleteSession: (id: string) => void;
  setSpecialist: (specialist: Specialist | null) => void;
  setVaultKey: (key: string | null) => void;
  toggleBuilderMode: () => void;
  toggleWebSearch: () => void;
  toggleMemory: () => void;
}

export const useBvmbinoStore = create<BvmbinoState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      activeSpecialist: null,
      isBuilderMode: false,
      isWebSearchEnabled: false,
      isMemoryEnabled: true,
      vaultKey: null,

      addMessage: (content, role, files) => {
        const { currentSessionId, sessions } = get();
        const newMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content,
          role,
          timestamp: Date.now(),
          files
        };

        if (!currentSessionId) {
          const newSessionId = Date.now().toString();
          const newSession: ChatSession = {
            id: newSessionId,
            title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
            messages: [newMessage],
            updatedAt: Date.now()
          };
          set({ 
            sessions: [newSession, ...sessions],
            currentSessionId: newSessionId 
          });
        } else {
          set({
            sessions: sessions.map(s => 
              s.id === currentSessionId 
                ? { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() }
                : s
            )
          });
        }
      },

      setCurrentSession: (id) => set({ currentSessionId: id }),

      createNewSession: () => {
        const newSessionId = Date.now().toString();
        const newSession: ChatSession = {
          id: newSessionId,
          title: 'New conversation',
          messages: [],
          updatedAt: Date.now()
        };
        set({ 
          sessions: [newSession, ...get().sessions],
          currentSessionId: newSessionId,
          activeSpecialist: null
        });
      },

      deleteSession: (id) => {
        const { sessions, currentSessionId } = get();
        set({
          sessions: sessions.filter(s => s.id !== id),
          currentSessionId: currentSessionId === id ? null : currentSessionId
        });
      },

      setSpecialist: (specialist) => set({ activeSpecialist: specialist }),
      
      setVaultKey: (key) => set({ vaultKey: key }),

      toggleBuilderMode: () => set((state) => ({ isBuilderMode: !state.isBuilderMode })),
      
      toggleWebSearch: () => set((state) => ({ isWebSearchEnabled: !state.isWebSearchEnabled })),
      
      toggleMemory: () => set((state) => ({ isMemoryEnabled: !state.isMemoryEnabled })),
    }),
    {
      name: 'bvmbino-pro-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
