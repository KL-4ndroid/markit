/** Transient view state only; never use this port for business records or credentials. */
export interface SessionStatePort {
  read(key: string): string | null;
  write(key: string, value: string): void;
}
