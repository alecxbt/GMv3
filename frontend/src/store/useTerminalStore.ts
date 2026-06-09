import { create } from 'zustand';
import type { Pane, Layout } from '@shared/types';

interface TerminalState {
  panes: Pane[];
  activePaneId: string | null;
  commandHistory: string[];
  historyIndex: number;
  layouts: Layout[];
  currentLayoutId: string | null;
  theme: 'dark' | 'light' | 'custom';
  cliVisible: boolean;
  paneZIndices: Record<string, number>; // Track z-index for each pane
  globalZIndex: number; // Global counter for z-index
  
  // Actions
  addPane: (pane: Pane) => void;
  removePane: (id: string) => void;
  updatePane: (id: string, updates: Partial<Pane>) => void;
  setActivePane: (id: string | null) => void;
  bringPaneToFront: (id: string) => void; // Bring pane to front (highest z-index)
  linkPanes: (paneIds: string[], ticker: string) => void;
  reorderPanes: (fromIndex: number, toIndex: number) => void;
  
  // Command history
  addToHistory: (command: string) => void;
  navigateHistory: (direction: 'up' | 'down') => string | null;
  resetHistoryIndex: () => void;
  
  // Layouts
  saveLayout: (layout: Layout) => void;
  saveCurrentLayout: (name: string) => string;
  loadLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'custom') => void;
  
  // CLI visibility
  setCliVisible: (visible: boolean) => void;
  toggleCli: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  panes: [],
  activePaneId: null,
  commandHistory: [],
  historyIndex: -1,
  layouts: [],
  currentLayoutId: null,
  theme: 'dark',
  cliVisible: true, // Start visible, will hide after first command
  paneZIndices: {},
  globalZIndex: 1, // Start at 1, 0 is for inactive panes
  
  addPane: (pane) => {
    set((state) => {
      // Calculate cascade position for new pane (cascade effect like windows)
      const existingPanes = state.panes;
      const cascadeOffset = 30;
      const defaultWidth = 500;
      const defaultHeight = 400;
      
      // Calculate cascade position
      let pixelX = 20 + (existingPanes.length % 10) * cascadeOffset;
      let pixelY = 20 + (existingPanes.length % 10) * cascadeOffset;
      
      // Use provided gridLayout if available, otherwise calculate pixel position
      const newPane: Pane = {
        ...pane,
        gridLayout: pane.gridLayout || {
          x: 0,
          y: 0,
          w: 6,
          h: 8,
          minW: 3,
          minH: 4,
          pixelX,
          pixelY,
          pixelWidth: defaultWidth,
          pixelHeight: defaultHeight,
        },
      };
      
      // Assign z-index to new pane (bring it to front)
      const newZIndex = state.globalZIndex + 1;
      
      return {
        panes: [...state.panes, newPane],
        activePaneId: newPane.id,
        paneZIndices: {
          ...state.paneZIndices,
          [newPane.id]: newZIndex,
        },
        globalZIndex: newZIndex,
      };
    });
  },
  
  removePane: (id) => {
    set((state) => {
      const newZIndices = { ...state.paneZIndices };
      delete newZIndices[id];
      return {
        panes: state.panes.filter((p) => p.id !== id),
        activePaneId: state.activePaneId === id ? null : state.activePaneId,
        paneZIndices: newZIndices,
      };
    });
  },
  
  updatePane: (id, updates) => {
    set((state) => ({
      panes: state.panes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },
  
  setActivePane: (id) => {
    set((state) => {
      // When setting active pane, also bring it to front
      if (id && state.paneZIndices[id] !== undefined) {
        const newZIndex = state.globalZIndex + 1;
        return {
          activePaneId: id,
          paneZIndices: {
            ...state.paneZIndices,
            [id]: newZIndex,
          },
          globalZIndex: newZIndex,
        };
      }
      return { activePaneId: id };
    });
  },
  
  bringPaneToFront: (id) => {
    set((state) => {
      if (!id || !state.paneZIndices[id]) return state;
      const newZIndex = state.globalZIndex + 1;
      return {
        activePaneId: id,
        paneZIndices: {
          ...state.paneZIndices,
          [id]: newZIndex,
        },
        globalZIndex: newZIndex,
      };
    });
  },
  
  linkPanes: (paneIds, ticker) => {
    set((state) => ({
      panes: state.panes.map((p) =>
        paneIds.includes(p.id)
          ? { ...p, linkedTickers: [...(p.linkedTickers || []), ticker] }
          : p
      ),
    }));
  },
  
  reorderPanes: (fromIndex, toIndex) => {
    set((state) => {
      const newPanes = [...state.panes];
      const [moved] = newPanes.splice(fromIndex, 1);
      newPanes.splice(toIndex, 0, moved);
      return { panes: newPanes };
    });
  },
  
  addToHistory: (command) => {
    set((state) => ({
      commandHistory: [...state.commandHistory, command],
      historyIndex: -1,
    }));
  },
  
  navigateHistory: (direction) => {
    const state = get();
    const { commandHistory, historyIndex } = state;
    
    if (commandHistory.length === 0) return null;
    
    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1 
        ? -1 
        : Math.min(commandHistory.length - 1, historyIndex + 1);
    }
    
    set({ historyIndex: newIndex });
    return newIndex >= 0 ? commandHistory[newIndex] : null;
  },
  
  resetHistoryIndex: () => {
    set({ historyIndex: -1 });
  },
  
  saveLayout: (layout) => {
    set((state) => {
      // Check if layout with same name exists, update it instead of adding
      const existingIndex = state.layouts.findIndex((l) => l.id === layout.id || l.name === layout.name);
      let newLayouts;
      if (existingIndex >= 0) {
        newLayouts = [...state.layouts];
        newLayouts[existingIndex] = layout;
      } else {
        newLayouts = [...state.layouts, layout];
      }
      return {
        layouts: newLayouts,
        currentLayoutId: layout.id,
      };
    });
  },
  
  saveCurrentLayout: (name: string) => {
    const state = get();
    const layout: Layout = {
      id: `layout-${Date.now()}`,
      name,
      panes: state.panes,
      grid: {
        rows: 1,
        cols: 1,
      },
    };
    state.saveLayout(layout);
    return layout.id;
  },
  
  loadLayout: (layoutId) => {
    const state = get();
    const layout = state.layouts.find((l) => l.id === layoutId);
    if (layout) {
      set({
        panes: layout.panes,
        currentLayoutId: layoutId,
      });
    }
  },
  
  deleteLayout: (layoutId) => {
    set((state) => ({
      layouts: state.layouts.filter((l) => l.id !== layoutId),
      currentLayoutId: state.currentLayoutId === layoutId ? null : state.currentLayoutId,
    }));
  },
  
  setTheme: (theme) => {
    set({ theme });
  },
  
  setCliVisible: (visible) => {
    set({ cliVisible: visible });
  },
  
  toggleCli: () => {
    set((state) => ({ cliVisible: !state.cliVisible }));
  },
}));

