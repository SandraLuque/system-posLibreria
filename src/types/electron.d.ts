export {};

declare global {
  interface Window {
    electronAPI: {
      loginSuccess: () => void;
      sendMessage: (msg: string) => void;
      onMessageReply: (callback: (data: string) => void) => void;
      sendMessagePrivate: (msg: string) => void;
      onMessageReplyPrivate: (callback: (data: string) => void) => void;
    };
  }
}
