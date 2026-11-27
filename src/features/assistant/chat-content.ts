export const MAX_CHAT_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CONTEXT_IMAGES = 2;

export type ChatImage = {
  mimeType: 'image/jpeg';
  data: string;
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  text: string;
  image?: ChatImage;
};

export function makeChatTurns(
  previous: ChatTurn[],
  text: string,
  image?: ChatImage,
): ChatTurn[] {
  let turns: ChatTurn[] = [
    ...previous.slice(-6),
    { role: 'user', text, ...(image ? { image } : {}) },
  ];
  // Keep complete question/answer pairs and at most two recent photos.
  while (turns.length > 1 && (
    turns.filter(turn => turn.image).length > MAX_CONTEXT_IMAGES ||
    turns.reduce((size, turn) => size + turn.text.length, 0) > 5000
  )) {
    turns = turns.slice(2);
  }
  return turns;
}
