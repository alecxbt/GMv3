interface KanbanStateData {
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  columnOrder: string[];
  tasks: Record<string, {
    id: string;
    content: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedEffort?: string;
    reason?: string;
    columnId: string;
    projectLabel: string;
  }>;
}

interface ElectronAPI {
  loadKanbanState?: () => Promise<{ success: boolean; data?: KanbanStateData }>;
  saveKanbanState?: (data: KanbanStateData) => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
