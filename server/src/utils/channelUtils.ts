export const getThreadName = (chatId: string) => {
    return `Chat-${chatId.slice(-8)}`;
}