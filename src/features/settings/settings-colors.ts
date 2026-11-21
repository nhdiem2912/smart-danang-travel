import {
  useColorScheme,
} from '@/hooks/use-color-scheme';

export const SETTINGS_COLORS = {
  light: {
    background: '#F6F9FC',
    card: '#FFFFFF',
    text: '#253347',
    muted: '#718096',
    line: '#E1E9F1',
    input: '#F8FAFC',
    green: '#087F61',
    pale: '#ECFDF5',
    danger: '#B42318',
    overlay: '#0F172A88',
  },
  dark: {
    background: '#0C1421',
    card: '#172334',
    text: '#E8EEF7',
    muted: '#A5B5C8',
    line: '#2B3D53',
    input: '#1D2C40',
    green: '#79E0B7',
    pale: '#183B31',
    danger: '#FDA4AF',
    overlay: '#00000099',
  },
};

export function useSettingsColors() {
  const scheme = useColorScheme();

  return SETTINGS_COLORS[
    scheme === 'dark' ? 'dark' : 'light'
  ];
}