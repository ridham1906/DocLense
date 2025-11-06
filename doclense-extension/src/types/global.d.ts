// Global type declarations for WXT and Chrome Extension APIs

declare global {
  const defineContentScript: any;
  const defineBackground: any;
}

declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      id?: string;
      url?: string;
      origin?: string;
    }

    const onMessage: {
      addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => void): void;
    };

    function sendMessage(message: any): Promise<any>;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: any): Promise<any>;
  }

  namespace action {
    function openPopup(): Promise<void>;
  }
}

export {};
