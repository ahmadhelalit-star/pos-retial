import { useEffect, useReducer } from 'react';
import { appReducer, createInitialState } from './appReducer';
import { AppDispatchContext, AppStateContext } from './contexts';
import { persistState } from '../services/persistence';

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  useEffect(() => {
    persistState(state);
  }, [state]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
