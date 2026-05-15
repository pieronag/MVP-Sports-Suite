import { useAuth } from '../store/useAuth';

export const useColorScheme = () => {
  const { theme } = useAuth();
  return theme;
};
