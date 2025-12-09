import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StreamContextType {
  isStreamPaused: boolean;
  toggleStream: () => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider = ({ children }: { children: ReactNode }) => {
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  const toggleStream = () => {
    setIsStreamPaused(prev => !prev);
  };

  return (
    <StreamContext.Provider value={{ isStreamPaused, toggleStream }}>
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = () => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};
