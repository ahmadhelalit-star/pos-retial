import { createContext, useContext } from 'react';

export const HeaderSearchSlotContext = createContext(null);

export function useHeaderSearchSlot() {
  return useContext(HeaderSearchSlotContext);
}
