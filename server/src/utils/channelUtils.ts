export const getThreadName = (chatId: string) => {
    return `Chat-${chatId.slice(-8)}`;
}

export function sanitizeChannelName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
}