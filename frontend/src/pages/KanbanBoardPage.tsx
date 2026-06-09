import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { useAuthStore, api } from '../stores/authStore';

// --- Interfaces for Kanban Board Data ---
interface Task {
  id: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedEffort?: string; // e.g., '2h', '1d'
  reason?: string; // Reason for update/feature
  columnId: string; // Track which column it belongs to
  projectLabel: string; // Project label for categorization
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface KanbanState {
  columns: Record<string, Column>;
  columnOrder: string[];
  tasks: Record<string, Task>;
}

// --- Initial Mock Data ---
// This would ideally be loaded from local storage or backend API
const initialKanbanData: KanbanState = {
  columns: {
    'backlog': { id: 'backlog', title: 'Backlog', taskIds: [] },
    'today': { id: 'today', title: "Today's Focus", taskIds: [] },
    'in-progress': { id: 'in-progress', title: 'In Progress', taskIds: [] },
    'blocked': { id: 'blocked', title: 'Blocked', taskIds: [] },
    'done': { id: 'done', title: 'Done', taskIds: [] },
  },
  columnOrder: ['backlog', 'today', 'in-progress', 'blocked', 'done'],
  tasks: {},
};

export const KanbanBoardPage: React.FC = () => {
  const [kanbanData, setKanbanData] = useState<KanbanState>(initialKanbanData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the new task form
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskEffort, setNewTaskEffort] = useState('');
  const [newTaskReason, setNewTaskReason] = useState('');
  const [newTaskProjectLabel, setNewTaskProjectLabel] = useState(''); // State for the new project label input
  const [addingToColumnId, setAddingToColumnId] = useState<string | null>(null);

  const { user, accessToken, checkAuth, kanbanBoard } = useAuthStore();

  // --- Effect for initial data load ---
  useEffect(() => {
    const loadKanbanData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use data from authStore if available (fetched on login/auth check)
        if (user && kanbanBoard && Object.keys(kanbanBoard.tasks).length > 0) {
          setKanbanData(kanbanBoard);
        } else if (user && accessToken) {
          // If data is not in store, fetch it from API
          const response = await api.get<KanbanState>('/api/kanban');
          setKanbanData(response.data);
          // Optionally update authStore with fetched data here if not done automatically
          // useAuthStore.setState({ kanbanBoard: response.data }); 
        } else {
          // If no user or auth token, use default/mock data or local storage if Electron
          if (window.electronAPI && typeof window.electronAPI.loadKanbanState === 'function') {
            const result = await window.electronAPI.loadKanbanState();
            if (result.success && result.data) {
              setKanbanData(result.data);
            } else {
              populateDefaultTasks();
            }
          } else {
            populateDefaultTasks();
          }
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading Kanban data:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Redirect to login if unauthorized
        }
        setError('Failed to load Kanban board data.');
        setIsLoading(false);
      }
    };
    loadKanbanData();
  }, [user, accessToken, kanbanBoard, checkAuth]); // Dependencies to re-fetch if user, token, or store data changes

  // --- Function to populate default tasks ---
  const populateDefaultTasks = () => {
    const defaultTasks: Task[] = [
      // GM Terminal Tasks
      { id: 'task-feat-auth', content: 'Implement Backend Auth System', priority: 'high', reason: 'Net New: Core user authentication infrastructure.', columnId: 'done', projectLabel: 'GM Terminal' },
      { id: 'task-feat-layout-api', content: 'Create Backend API for Layouts', priority: 'high', reason: 'Net New: API endpoints to manage user-saved layouts.', columnId: 'done', projectLabel: 'GM Terminal' },
      { id: 'task-feat-terminal-pane', content: 'Create Functional Terminal Pane', priority: 'high', reason: 'Net New: Implemented working terminal pane.', columnId: 'done', projectLabel: 'GM Terminal' },
      { id: 'task-research-data', content: 'Research Financial Data Providers', priority: 'high', reason: 'Critical for dashboard functionality.', columnId: 'today', projectLabel: 'GM Terminal' },
      { id: 'task-refine-chart', content: 'Refine ChartPane Component', priority: 'high', reason: 'Prepare for data integration.', columnId: 'today', projectLabel: 'GM Terminal' },
      { id: 'task-plan-data-fetch', content: 'Plan Data Fetching Strategy', priority: 'medium', reason: 'Outline API integration steps.', columnId: 'today', projectLabel: 'GM Terminal' },
      // Venture Firm Tech Stack Goals
      { id: 'task-vc-deal-flow', content: 'Design Deal Flow System Architecture', priority: 'high', reason: 'Net New: Foundational R&D for VC firm.', columnId: 'backlog', projectLabel: 'Venture Firm Tech Stack' },
      { id: 'task-vc-portfolio-analytics', content: 'Outline Portfolio Analytics Module', priority: 'high', reason: 'Core R&D for VC firm needs.', columnId: 'backlog', projectLabel: 'Venture Firm Tech Stack' },
      // General Tasks
      { id: 'task-general-cleanup', content: 'Refactor common UI components', priority: 'medium', reason: 'Improve code quality and consistency.', columnId: 'in-progress', projectLabel: 'General' },
      { id: 'task-pro-tier-design', content: 'Design Pro Tier Enforcement Logic', priority: 'medium', reason: 'Plan subscription management.', columnId: 'backlog', projectLabel: 'GM Terminal' },
      { id: 'task-test-auth', content: 'Test Authentication Flow', priority: 'medium', reason: 'Ensure auth robustness.', columnId: 'backlog', projectLabel: 'GM Terminal' },
    ];

    const currentTasks: Record<string, Task> = {};
    const currentColumns = { ...initialKanbanData.columns };

    defaultTasks.forEach((task: Task) => {
      currentTasks[task.id] = task;
      if (currentColumns[task.columnId]) {
        currentColumns[task.columnId].taskIds.push(task.id);
      }
    });
    setKanbanData({ columns: currentColumns, columnOrder: initialKanbanData.columnOrder, tasks: currentTasks });
  };

  // --- Drag and Drop Logic ---
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const startColumn = kanbanData.columns[source.droppableId];
    const endColumn = kanbanData.columns[destination.droppableId];
    const taskToMove = kanbanData.tasks[draggableId];

    // Update task's columnId
    const updatedTask: Task = { ...taskToMove, columnId: destination.droppableId };

    const newStartTaskIds = Array.from(startColumn.taskIds);
    newStartTaskIds.splice(source.index, 1);
    const newStartColumn = { ...startColumn, taskIds: newStartTaskIds };

    const newEndTaskIds = Array.from(endColumn.taskIds);
    newEndTaskIds.splice(destination.index, 0, draggableId);
    const newEndColumn = { ...endColumn, taskIds: newEndTaskIds };

    const updatedKanbanData = {
      ...kanbanData,
      tasks: { ...kanbanData.tasks, [draggableId]: updatedTask },
      columns: {
        ...kanbanData.columns,
        [startColumn.id]: newStartColumn,
        [endColumn.id]: newEndColumn,
      },
    };
    setKanbanData(updatedKanbanData);

    // Persist changes using Electron IPC or Backend API
    if (window.electronAPI && typeof window.electronAPI.saveKanbanState === 'function') {
      window.electronAPI.saveKanbanState(updatedKanbanData);
    } else {
      // Fallback: call a backend API to save Kanban state (e.g., PUT /api/kanban)
      // This would need to be implemented in the backend and authStore
      // Example: api.put('/api/kanban', updatedKanbanData).catch(err => console.error('Failed to save Kanban state:', err));
      toast.info('Kanban changes saved (simulated).');
    }
  };

  // --- Task Input Handling ---
  const handleAddTask = (columnId: string) => {
    if (!newTaskContent.trim()) {
      toast.error('Task content cannot be empty!');
      return;
    }

    const newTask: Task = {
      id: `task-${uuidv4()}`,
      content: newTaskContent,
      priority: newTaskPriority,
      estimatedEffort: newTaskEffort,
      reason: newTaskReason,
      columnId: columnId,
      projectLabel: newTaskProjectLabel.trim() || 'General', // Default if empty
    };

    setKanbanData(prevData => {
      const newTasks = { ...prevData.tasks, [newTask.id]: newTask };
      const targetColumn = prevData.columns[columnId];
      const newTargetColumn = { ...targetColumn, taskIds: [...targetColumn.taskIds, newTask.id] };
      return {
        ...prevData,
        tasks: newTasks,
        columns: {
          ...prevData.columns,
          [columnId]: newTargetColumn,
        },
      };
    });

    setNewTaskContent(''); setNewTaskPriority('medium'); setNewTaskEffort(''); setNewTaskReason(''); setNewTaskProjectLabel('');
    setAddingToColumnId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'content') setNewTaskContent(value);
    if (name === 'priority') setNewTaskPriority(value as Task['priority']);
    if (name === 'effort') setNewTaskEffort(value);
    if (name === 'reason') setNewTaskReason(value);
    if (name === 'projectLabel') setNewTaskProjectLabel(value);
  };

  // --- UI Rendering ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-gray-100">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-gray-100 font-sans">
      <h1 className="text-4xl font-bold text-green-500 mb-8 text-center">Daily Task Kanban</h1>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${kanbanData.columnOrder.length} gap-6`}>
          {kanbanData.columnOrder.map((columnId) => {
            const column = kanbanData.columns[columnId];
            const tasksInColumn = column.taskIds
              .map(taskId => kanbanData.tasks[taskId])
              .filter(task => task !== undefined && task.columnId === columnId); // Ensure task is valid and in correct column

            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-gray-800 p-4 rounded-lg shadow-md border ${snapshot.isDraggingOver ? 'border-green-500' : 'border-gray-700'} flex flex-col min-h-[300px]`}
                  >
                    <h2 className="text-xl font-semibold text-green-500 mb-4">{column.title} ({tasksInColumn.length})</h2>
                    
                    {/* Add Task Input Section */}
                    {addingToColumnId === column.id && (
                      <div className="bg-gray-700 p-3 rounded-lg mb-4">
                        <input type="text" name="content" placeholder="Task description" value={newTaskContent} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"/>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <select name="priority" value={newTaskPriority} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500">
                              <option value="low">Low Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="high">High Priority</option>
                            </select>
                          </div>
                          <div>
                            <input type="text" name="effort" placeholder="Effort (e.g., 2h)" value={newTaskEffort} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"/>
                          </div>
                        </div>
                        <textarea name="reason" placeholder="Reason for update / Net new" value={newTaskReason} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none mb-2"></textarea>
                        <div>
                          <input type="text" name="projectLabel" placeholder="Project Label (e.g., GM Terminal)" value={newTaskProjectLabel} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"/>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setAddingToColumnId(null)} className="px-3 py-1 bg-gray-600 text-gray-100 rounded hover:bg-gray-500">Cancel</button>
                          <button onClick={() => handleAddTask(column.id)} className="px-3 py-1 bg-green-600 text-black rounded hover:bg-green-500">Add Task</button>
                        </div>
                      </div>
                    )}

                    {!addingToColumnId && (
                      <button onClick={() => setAddingToColumnId(column.id)} className="w-full mb-4 px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm">+ Add Task to {column.title}</button>
                    )}

                    {/* Render tasks in this column */}
                    {tasksInColumn.map((task, index) => (
                      <Draggable draggableId={task.id} index={index} key={task.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-gray-700 p-3 rounded-lg mb-3 shadow-sm text-gray-200 cursor-grab hover:bg-gray-600 transition-colors ${snapshot.isDragging ? 'opacity-70' : ''}`}
                          >
                            <p className="text-sm font-medium mb-1">{task.content}</p>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className={`px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-700 text-white' : task.priority === 'medium' ? 'bg-yellow-600 text-black' : 'bg-blue-700 text-white'}`}>
                                {task.priority || 'medium'}
                              </span>
                              {task.estimatedEffort && <span className="text-gray-400">{task.estimatedEffort}</span>}
                            </div>
                            {task.reason && <p className="text-gray-400 text-xs italic mt-1">{task.reason}</p>}
                            <p className="text-blue-400 text-xs mt-1">Project: {task.projectLabel}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
