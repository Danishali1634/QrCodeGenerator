export type QRItem = {
  id: string;
  value: string;
};

export type QRSize = 'small' | 'medium' | 'large' | 'xl';
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';
export type ThemeMode = 'light' | 'dark' | 'system';

export type Settings = {
  removeDuplicates: boolean;
  qrSize: QRSize;
  errorCorrection: ErrorCorrection;
  margin: number;
  wrapAround: boolean;
};

export type PersistedState = {
  items: QRItem[];
  currentIndex: number;
  settings: Settings;
  theme: ThemeMode;
  inputText: string;
};

export const DEFAULT_SETTINGS: Settings = {
  removeDuplicates: true,
  qrSize: 'large',
  errorCorrection: 'M',
  margin: 4,
  wrapAround: false,
};

export const QR_SIZE_PX: Record<QRSize, number> = {
  small: 180,
  medium: 260,
  large: 360,
  xl: 480,
};
