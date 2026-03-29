export interface CursorPayload {
  id?: string;
  dir?: 'prev';
}

export function encodeCursor(data: CursorPayload): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeCursor(raw: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function flipOrder(order: 'ASC' | 'DESC'): 'ASC' | 'DESC' {
  return order === 'DESC' ? 'ASC' : 'DESC';
}