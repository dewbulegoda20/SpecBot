'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bookmark, Sparkles } from 'lucide-react';
import { useAppStore, Message, Reference } from '@/lib/store';
import { format } from 'date-fns';

interface ChatAreaProps {
  onSendMessage: (message: string) => void;
  onReferenceClick: (reference: Reference) => void;
}

export default function ChatArea({ onSendMessage, onReferenceClick }: ChatAreaProps) {
  const { messages, isLoading, currentDocument } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 h-full w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
        {messages.length === 0 && !currentDocument ? (
          <div className="flex gap-3 p-4">
            <div className="bg-primary/20 flex-shrink-0 rounded-full size-10 flex items-center justify-center">
              <Sparkles className="text-primary w-6 h-6" />
            </div>
            <div className="flex flex-1 flex-col items-stretch gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">
                    SpecBot
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
                    Just now
                  </p>
                </div>
                <p className="text-gray-800 dark:text-gray-300 text-base font-normal leading-normal">
                  Welcome! Upload an electrical specification to get started. You can ask questions like 'What is the required voltage for circuit X?'
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onReferenceClick={onReferenceClick}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 p-4">
            <div className="bg-primary/20 flex-shrink-0 rounded-full size-10 flex items-center justify-center">
              <Sparkles className="text-primary w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-1 flex-col items-stretch gap-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Thinking...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 bg-gray-300 dark:bg-gray-700" />
          <div className="flex flex-col flex-1 h-12">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <input
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-0 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 rounded-r-none border-r-0 pr-2 text-base font-normal leading-normal"
                placeholder="Ask a question about the specification..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || !currentDocument}
              />
              <div className="flex border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 items-center justify-center pr-4 rounded-r-lg border-l-0 !pr-2">
                <div className="flex items-center gap-4 justify-end">
                  <div className="flex items-center gap-1">
                    <button className="flex items-center justify-center p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <button className="flex items-center justify-center p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    className="min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-primary text-white text-sm font-medium leading-normal flex disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    onClick={handleSubmit}
                    disabled={isLoading || !input.trim() || !currentDocument}
                  >
                    <span className="hidden sm:inline truncate">Send</span>
                    <Send className="w-4 h-4 sm:hidden" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onReferenceClick }: { 
  message: Message; 
  onReferenceClick: (reference: Reference) => void;
}) {
  const isAssistant = message.role === 'assistant';

  // Function to parse content and insert inline reference links
  const renderContentWithReferences = (content: string, references: Reference[] = []) => {
    // Debug logging
    console.log('Rendering content with references:', {
      contentLength: content.length,
      referencesCount: references.length,
      references: references.map(r => ({ pageNumber: r.pageNumber, text: r.text?.substring(0, 50) }))
    });
    
    // Parse markdown-style formatting and citations
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Combined regex for citations [1], bold **text**, and newlines
    const combinedRegex = /(\[(\d+)\])|(\*\*([^*]+)\*\*)/g;
    let match;
    let key = 0;

    while ((match = combinedRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(<span key={`text-${key++}`}>{textBefore}</span>);
      }

      // Check if it's a citation [1], [2], etc.
      if (match[2]) {
        const citationNumber = parseInt(match[2]);
        // References array index matches citation number (1-indexed) minus 1
        const reference = references[citationNumber - 1];
        
        console.log(`Found citation [${citationNumber}], reference at index ${citationNumber - 1}:`, 
          reference ? `Page ${reference.pageNumber}` : 'NOT FOUND',
          `Total refs: ${references.length}`);

        if (reference) {
          parts.push(
            <button
              key={`ref-${key++}`}
              onClick={() => {
                console.log('Clicked reference:', reference);
                onReferenceClick(reference);
              }}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm bg-primary/10 px-2 py-0.5 rounded mx-1"
              title={`Page ${reference.pageNumber}`}
            >
              [{citationNumber}]
              <span className="text-xs">p.{reference.pageNumber}</span>
            </button>
          );
        } else {
          console.warn(`No reference found for citation [${citationNumber}]. References array has ${references.length} items.`);
          parts.push(<span key={`citation-${key++}`} className="text-red-500">{match[0]}</span>);
        }
      }
      // Check if it's bold **text**
      else if (match[4]) {
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-gray-900 dark:text-white">
            {match[4]}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      parts.push(<span key={`text-${key++}`}>{remainingText}</span>);
    }

    return (
      <div className="text-gray-800 dark:text-gray-300 text-base font-normal leading-relaxed whitespace-pre-wrap">
        {parts.length > 0 ? parts : content}
      </div>
    );
  };

  return (
    <div className="flex gap-3 p-4">
      <div className={`flex-shrink-0 rounded-full size-10 flex items-center justify-center ${
        isAssistant 
          ? 'bg-primary/20' 
          : 'bg-gray-300 dark:bg-gray-700'
      }`}>
        {isAssistant ? (
          <Sparkles className="text-primary w-6 h-6" />
        ) : (
          <div className="w-6 h-6" />
        )}
      </div>
      <div className="flex flex-1 flex-col items-stretch gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">
              {isAssistant ? 'SpecBot' : 'You'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
              {format(new Date(message.createdAt), 'HH:mm')}
            </p>
          </div>
          
          {/* Render content with inline references */}
          {renderContentWithReferences(message.content, message.references)}
        </div>
      </div>
    </div>
  );
}
