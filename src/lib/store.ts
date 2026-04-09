import { create } from 'zustand';
import type { Dataset, BiasAnalysis, SimulationScenario, User } from './types';

interface AppState {
  user: User | null;
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentAnalysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
  setUser: (user: User | null) => void;
  addDataset: (dataset: Dataset) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  setCurrentAnalysis: (analysis: BiasAnalysis | null) => void;
  addSimulation: (sim: SimulationScenario) => void;
  clearSimulations: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  datasets: [],
  currentDataset: null,
  currentAnalysis: null,
  simulations: [],
  setUser: (user) => set({ user }),
  addDataset: (dataset) => set((s) => ({ datasets: [...s.datasets, dataset] })),
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
  clearSimulations: () => set({ simulations: [] }),
}));
