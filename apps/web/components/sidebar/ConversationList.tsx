'use client';

import React, { useState } from 'react';
import { MessageSquare, MoreVertical, Trash2, Edit2, Check, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { ConversationItem } from '../../types';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ConversationListProps {
  searchQuery: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ searchQuery }) => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    setMessages,
    removeConversation,
    updateConversationTitle
  } = useChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = async (conv: ConversationItem) => {
    setCurrentConversationId(conv.id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useChatStore.getState().setIsSidebarOpen(false);
    }
    try {
      const data = await api.getConversation(conv.id);
      if (data && data.messages) {
        setMessages(data.messages);
        const lastWithMedia = [...data.messages].reverse().find((m: any) => m.metadata?.mediaContext);
        if (lastWithMedia?.metadata?.mediaContext) {
          useChatStore.getState().setMediaContext(lastWithMedia.metadata.mediaContext);
        } else {
          useChatStore.getState().setMediaContext(null);
        }
      }
    } catch (err) {
      toast.error('Could not load conversation history.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      removeConversation(id);
      toast.success('Conversation removed.');
    } catch (err) {
      removeConversation(id);
    }
  };

  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitleText(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitleText.trim()) {
      updateConversationTitle(id, editTitleText.trim());
      await api.renameConversation(id, editTitleText.trim()).catch(() => {});
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-1 py-1">
      {filtered.map((conv) => {
        const isSelected = conv.id === currentConversationId;
        const isEditing = editingId === conv.id;

        return (
          <div
            key={conv.id}
            onClick={() => !isEditing && handleSelectConversation(conv)}
            className={cn(
              'group relative flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition-all',
              isSelected
                ? 'bg-primary/12 text-primary font-semibold shadow-2xs border border-primary/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#F2ECE1]/60 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <div className="flex items-center gap-2.5 overflow-hidden flex-1">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />

              {isEditing ? (
                <input
                  type="text"
                  value={editTitleText}
                  onChange={(e) => setEditTitleText(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-primary text-xs px-1.5 py-0.5 rounded outline-none w-full text-zinc-900 dark:text-zinc-100"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{conv.title}</span>
              )}
            </div>

            {/* Hover Actions */}
            {isEditing ? (
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={(e) => handleSaveRename(conv.id, e)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(null);
                  }}
                  className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                <button
                  type="button"
                  onClick={(e) => handleStartRename(conv, e)}
                  className="p-1 hover:text-primary rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="px-3 py-6 text-center text-xs text-zinc-400">
          No conversations found
        </div>
      )}
    </div>
  );
};
