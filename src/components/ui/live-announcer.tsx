import React, { createContext, useContext, useState, useCallback } from 'react';

interface LiveAnnouncerContextValue {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue>({
  announce: () => {},
});

export const useLiveAnnouncer = () => useContext(LiveAnnouncerContext);

export const LiveAnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (politeness === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <LiveAnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only select-none pointer-events-none"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only select-none pointer-events-none"
      >
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  );
};
