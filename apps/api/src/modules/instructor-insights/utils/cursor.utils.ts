export function encodeCursor(createdAtIso: string, id: string): string {
  return Buffer.from(`${createdAtIso}|${id}`, 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): { createdAtIso: string; id: string } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const [createdAtIso, id] = decoded.split('|');
  if (!createdAtIso || !id) throw new Error('Invalid cursor');
  return { createdAtIso, id };
}
