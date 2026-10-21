import type { SessionStatePort } from './contracts/session-state';
import { webSessionState } from './web/session-state';

let sessionState: SessionStatePort = webSessionState;

export const getSessionStatePort = (): SessionStatePort => sessionState;

export function installSessionStatePort(port: SessionStatePort): () => void {
  const previous = sessionState;
  sessionState = port;
  return () => {
    if (sessionState === port) sessionState = previous;
  };
}
