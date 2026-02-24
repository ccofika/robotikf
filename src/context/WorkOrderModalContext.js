import React, { createContext, useContext, useState, useCallback } from 'react';

const WorkOrderModalContext = createContext();

export const WorkOrderModalProvider = ({ children }) => {
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Call this from WorkOrderDetail when data is saved/changed
  const signalDataChanged = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  return (
    <WorkOrderModalContext.Provider value={{ refreshCounter, signalDataChanged }}>
      {children}
    </WorkOrderModalContext.Provider>
  );
};

export const useWorkOrderModal = () => {
  const context = useContext(WorkOrderModalContext);
  if (!context) {
    // When not inside provider (e.g. fullscreen mode), return no-op
    return { refreshCounter: 0, signalDataChanged: () => {} };
  }
  return context;
};
