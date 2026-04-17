import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dataset, BiasAnalysis, SimulationScenario, User, AppNotification } from './types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentAnalysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
  notifications: AppNotification[];
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  addDataset: (dataset: Dataset) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  setCurrentAnalysis: (analysis: BiasAnalysis | null) => void;
  addSimulation: (sim: SimulationScenario) => void;
  clearSimulations: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      datasets: [],
      currentDataset: null,
      currentAnalysis: null,
      simulations: [],
      notifications: [
        {
          id: '1',
          title: 'Welcome to EquityLens',
          message: 'Start by uploading your clinical datasets for fairness auditing.',
          type: 'info',
          read: false,
          timestamp: new Date().toISOString(),
        }
      ],
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, currentDataset: null, currentAnalysis: null, simulations: [], notifications: [] }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      addDataset: (dataset) => set((s) => ({ datasets: [...s.datasets, dataset] })),
      setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
      clearSimulations: () => set({ simulations: [] }),
      addNotification: (n) => set((s) => ({
        notifications: [
          {
            ...n,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...s.notifications,
        ].slice(0, 20),
      })),
      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: 'equitylens-store' }
  )
);

