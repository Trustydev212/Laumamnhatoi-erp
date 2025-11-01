'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChatbot({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatbotStatus, setChatbotStatus] = useState<{ configured: boolean; message: string } | null>(null);

  useEffect(() => {
    // Check chatbot status on mount
    const checkStatus = async () => {
      try {
        const response = await api.get('/admin/chatbot/status', {
          timeout: 15000 // 15 seconds for status check
        });
        setChatbotStatus(response.data);
        
        if (response.data.configured) {
          setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Xin chào! Tôi là trợ lý AI của hệ thống ERP. Tôi có thể giúp bạn:\n\n• Phân tích doanh thu và bán hàng\n• Kiểm tra tình trạng tồn kho\n• Đưa ra insights và đề xuất\n• Trả lời câu hỏi về dữ liệu kinh doanh\n\nHãy hỏi tôi bất cứ điều gì! 💡',
            timestamp: new Date()
          }]);
        } else {
          setMessages([{
            id: '1',
            role: 'assistant',
            content: response.data.message || 'Chatbot chưa được cấu hình. Vui lòng thêm OPENAI_API_KEY vào biến môi trường backend.',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Failed to check chatbot status:', error);
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Không thể kiểm tra trạng thái chatbot. Vui lòng thử lại sau.',
          timestamp: new Date()
        }]);
      }
    };
    
    checkStatus();
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Tăng timeout cho chatbot request (60 giây vì cần query DB và gọi OpenAI)
      const response = await api.post('/admin/chatbot/chat', {
        message: userMessage.content
      }, {
        timeout: 60000 // 60 seconds for chatbot requests
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || 'Xin lỗi, không thể trả lời câu hỏi này.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      
      let errorContent = 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.';
      
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorContent = 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại với câu hỏi ngắn hơn.';
      } else if (error?.response?.status === 404) {
        errorContent = 'Không tìm thấy endpoint chatbot. Vui lòng kiểm tra lại cấu hình backend.';
      } else if (error?.response?.status === 401) {
        errorContent = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error?.response?.data?.message) {
        errorContent = error.response.data.message;
      } else if (error?.message) {
        errorContent = `Lỗi: ${error.message}`;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'Doanh thu 30 ngày qua như thế nào?',
    'Nguyên liệu nào đang sắp hết?',
    'Món ăn nào bán chạy nhất?',
    'Đưa ra đề xuất cải thiện kinh doanh'
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-700 transition-colors"
          title="Mở chatbot"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 sm:h-[600px] h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-sm sm:text-base">AI Trợ Lý ERP</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-blue-800 rounded p-1.5 sm:p-1 transition-colors"
            title="Thu gọn"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="hover:bg-blue-800 rounded p-1.5 sm:p-1 transition-colors"
              title="Đóng"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap text-xs sm:text-sm break-words">{message.content}</div>
              <div className={`text-[10px] sm:text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
              <div className="flex space-x-1.5 sm:space-x-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="px-2 sm:px-4 pt-2 pb-2 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2">Câu hỏi nhanh:</div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickQuestion(q)}
                className="text-[10px] sm:text-xs bg-white border border-gray-300 rounded-full px-2 sm:px-3 py-1 hover:bg-gray-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2 sm:p-4 bg-white border-t border-gray-200 rounded-b-lg flex-shrink-0">
        <div className="flex space-x-1.5 sm:space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi..."
            className="flex-1 border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
              !input.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
