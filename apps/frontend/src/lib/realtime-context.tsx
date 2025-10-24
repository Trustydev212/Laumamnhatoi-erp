'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinPos: (tableId: string) => void;
  leavePos: (tableId: string) => void;
  joinKitchen: () => void;
  leaveKitchen: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinPos = (tableId: string) => {
    if (socket) {
      socket.emit('join-pos', { tableId });
    }
  };

  const leavePos = (tableId: string) => {
    if (socket) {
      socket.emit('leave-pos', { tableId });
    }
  };

  const joinKitchen = () => {
    if (socket) {
      socket.emit('join-kitchen');
    }
  };

  const leaveKitchen = () => {
    if (socket) {
      socket.emit('leave-kitchen');
    }
  };

  const value = {
    socket,
    isConnected,
    joinPos,
    leavePos,
    joinKitchen,
    leaveKitchen,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
