import { useEffect } from 'react';

const handlers: Array<() => boolean> = [];

export function useBackShortcut(handler: () => boolean) {
  useEffect(() => {
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }, [handler]);
}

export function triggerBackShortcut() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index]()) {
      return true;
    }
  }
  return false;
}