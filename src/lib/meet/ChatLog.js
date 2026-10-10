const MAX_MESSAGES = 200;
export const MAX_CHAT_LENGTH = 500;

/** Append-only chat history with an unread counter for the closed chat window. */
export class ChatLog {
  constructor() {
    this.messages = [];
    this.unread = 0;
    this.isOpen = false;
  }

  add(seat, text, at = Date.now()) {
    const clean = String(text ?? '').trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean) return null;
    const message = { seat, text: clean, at };
    this.messages = [...this.messages, message].slice(-MAX_MESSAGES);
    return message;
  }

  addIncoming(seat, text, at) {
    const message = this.add(seat, text, at);
    if (message && !this.isOpen) this.unread += 1;
    return message;
  }

  setOpen(isOpen) {
    this.isOpen = isOpen;
    if (isOpen) this.unread = 0;
  }
}
