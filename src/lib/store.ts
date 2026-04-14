import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dataset, BiasAnalysis, SimulationScenario, User } from './types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentAnalysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  addDataset: (dataset: Dataset) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  setCurrentAnalysis: (analysis: BiasAnalysis | null) => void;
  addSimulation: (sim: SimulationScenario) => void;
  clearSimulations: () => void;
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
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, currentDataset: null, currentAnalysis: null, simulations: [] }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      addDataset: (dataset) => set((s) => ({ datasets: [...s.datasets, dataset] })),
      setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
      clearSimulations: () => set({ simulations: [] }),
    }),
    { name: 'equitylens-store' }
  )
);
