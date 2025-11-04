import { create } from 'zustand';

export interface Reference {
  id: string;
  messageId: string;
  chunkId: string;
  pageNumber: number;
  text: string;
  relevance: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  references?: Reference[];
}

export interface Conversation {
  id: string;
  documentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  document?: {
    id: string;
    filename: string;
  };
  messages?: { id: string }[];
}

export interface Document {
  id: string;
  filename: string;
  filepath: string;
  filesize: number;
  uploadedAt: Date;
}

interface AppStore {
  // Current state
  currentDocument: Document | null;
  currentConversation: Conversation | null;
  messages: Message[];
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  
  // PDF viewer state
  highlightedReference: Reference | null;
  currentPage: number;
  
  // Dark mode
  darkMode: boolean;
  
  // Actions
  setCurrentDocument: (document: Document | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setConversations: (conversations: Conversation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHighlightedReference: (reference: Reference | null) => void;
  setCurrentPage: (page: number) => void;
  toggleDarkMode: () => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  currentDocument: null,
  currentConversation: null,
  messages: [],
  conversations: [],
  isLoading: false,
  error: null,
  highlightedReference: null,
  currentPage: 1,
  darkMode: false,
  
  // Actions
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setConversations: (conversations) => set({ conversations }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setHighlightedReference: (reference) => set({ 
    highlightedReference: reference,
    currentPage: reference ? reference.pageNumber : 1,
  }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleDarkMode: () => set((state) => {
    const newMode = !state.darkMode;
    if (typeof window !== 'undefined') {
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { darkMode: newMode };
  }),
  reset: () => set({
    currentDocument: null,
    currentConversation: null,
    messages: [],
    isLoading: false,
    error: null,
    highlightedReference: null,
    currentPage: 1,
  }),
}));
