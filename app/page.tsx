'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import CustomPDFViewer from '@/components/CustomPDFViewer';
import UploadModal from '@/components/UploadModal';
import ResizablePanel from '@/components/ResizablePanel';
import { useAppStore, Conversation, Reference } from '@/lib/store';

export default function Home() {
  const {
    currentDocument,
    currentConversation,
    setCurrentDocument,
    setCurrentConversation,
    setMessages,
    addMessage,
    setConversations,
    setLoading,
    setError,
    setHighlightedReference,
  } = useAppStore();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        console.error('Failed to load conversations:', response.status);
        setConversations([]);
        return;
      }
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      setError('Failed to load conversations');
    }
  }, [setConversations, setError]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      
      if (!response.ok) {
        console.error('Failed to load messages:', response.status);
        setMessages([]);
        return;
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMessages, setError]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation, loadMessages, setMessages]);

  const handleUpload = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Parse error response to get detailed error message
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Upload failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Set the current document and conversation
      setCurrentDocument(data.document);
      setCurrentConversation(data.conversation);

      // Reload conversations list
      await loadConversations();

      setError(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload document');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentConversation) {
      setError('No conversation selected');
      return;
    }

    try {
      setLoading(true);

      // Add user message to UI immediately
      const userMessage = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversation.id,
        role: 'user' as const,
        content: message,
        createdAt: new Date(),
      };
      addMessage(userMessage);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          question: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add assistant message with references
      addMessage(data.message);

      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    
    // If this conversation is for a different document, load that document
    if (conversation.document && conversation.document.id !== currentDocument?.id) {
      // Fetch the full document details
      try {
        const response = await fetch(`/api/documents/${conversation.document.id}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentDocument(data.document);
        }
      } catch (error) {
        console.error('Error loading document:', error);
      }
    }
  };

  const handleNewConversation = async () => {
    if (!currentDocument) {
      setIsUploadModalOpen(true);
      return;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: currentDocument.id,
          title: 'New Conversation',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      setCurrentConversation(data.conversation);
      await loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // If the deleted conversation was the current one, clear it
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Reload conversations list
      await loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    }
  };

  const handleReferenceClick = (reference: Reference) => {
    setHighlightedReference(reference);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onUploadClick={() => setIsUploadModalOpen(true)} 
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      
      <main className="flex flex-1 overflow-hidden bg-white dark:bg-background-dark">
        <div className="flex flex-1 border-r border-gray-200 dark:border-gray-800">
          <Sidebar
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          
          <ResizablePanel
            leftPanel={
              <ChatArea
                onSendMessage={handleSendMessage}
                onReferenceClick={handleReferenceClick}
              />
            }
            rightPanel={
              <CustomPDFViewer onUploadClick={() => setIsUploadModalOpen(true)} />
            }
            defaultLeftWidth={50}
          />
        </div>
      </main>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
