'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, ChevronLeft, Trash2 } from 'lucide-react';
import { useAppStore, Conversation } from '@/lib/store';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ onConversationSelect, onNewConversation, onDeleteConversation, isOpen, onToggle }: SidebarProps) {
  const { conversations, currentConversation } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery) {
      const filtered = conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const groupConversationsByDate = () => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const older: Conversation[] = [];

    filteredConversations.forEach((conv) => {
      const date = new Date(conv.createdAt);
      if (isToday(date)) {
        today.push(conv);
      } else if (isYesterday(date)) {
        yesterday.push(conv);
      } else if (isThisWeek(date)) {
        thisWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const { today, yesterday, thisWeek, older } = groupConversationsByDate();

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setConversationToDelete(null);
    }
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
    const isActive = currentConversation?.id === conversation.id;
    
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setConversationToDelete(conversation.id);
      setIsDeleteModalOpen(true);
    };
    
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-lg w-full transition-colors group ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <button
          onClick={() => onConversationSelect(conversation)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{conversation.title}</span>
        </button>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
          aria-label="Delete conversation"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        </button>
      </div>
    );
  };

  const ConversationGroup = ({ title, conversations }: { title: string; conversations: Conversation[] }) => {
    if (conversations.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 mt-4">
        <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold px-2 pt-2">
          {title}
        </p>
        {conversations.map((conv) => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col shrink-0 bg-white dark:bg-background-dark border-r border-gray-200 dark:border-gray-800 h-full transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-0 overflow-hidden'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-gray-900 dark:text-white text-sm font-bold">History</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewConversation}
            className="flex items-center justify-center p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="flex items-center justify-center p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            placeholder="Search history..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ConversationGroup title="Today" conversations={today} />
        <ConversationGroup title="Yesterday" conversations={yesterday} />
        <ConversationGroup title="Previous 7 Days" conversations={thisWeek} />
        <ConversationGroup title="Older" conversations={older} />
        
        {filteredConversations.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8 px-4">
            No conversations found
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}
