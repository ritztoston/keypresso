/// <reference types="vite/client" />

interface ElectronAPI {
  startShift: () => void;
  stopShift: () => void;
  minimizeWindow: () => void;
  closeWindow: () => void;
  getStartOnBoot: () => Promise<boolean>;
  setStartOnBoot: (enabled: boolean) => Promise<void>;
  quitApp: () => void;
  getStartMinimized: () => Promise<boolean>;
  setStartMinimized: (enabled: boolean) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}
