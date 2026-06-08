import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../stores/authStore';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { toast } from 'react-toastify'; // Assuming react-toastify is used for notifications

interface Layout {
  id: string;
  name: string;
  userId: string;
  panes?: any[]; // Placeholder for pane structure
  grid: {
    cols?: number;
    rowHeight?: number;
    layouts?: Record<string, any>; // Placeholder for ReactGridLayout layouts
  };
  createdAt: string;
  updatedAt: string;
}

interface LayoutFormState {
  name: string;
  // We won't edit panes/grid directly here, only name and potentially default grid settings
}

export const LayoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, isLoading: isAuthLoading, checkAuth } = useAuthStore();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<Layout | null>(null); // For editing
  const [newLayoutForm, setNewLayoutForm] = useState<LayoutFormState>({
    name: '',
  });

  useEffect(() => {
    // Ensure user is authenticated
    if (accessToken && !user) {
      checkAuth();
    }
    if (!accessToken && !isAuthLoading) {
      navigate('/login');
    }
  }, [accessToken, user, isAuthLoading, checkAuth, navigate]);

  useEffect(() => {
    if (user) {
      fetchLayouts();
    }
  }, [user]);

  const fetchLayouts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/layouts');
      setLayouts(response.data);
    } catch (err: any) {
      setError('Failed to fetch layouts. Please try again later.');
      console.error('Error fetching layouts:', err);
      // Handle specific errors, e.g., unauthorized
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLayoutForm({ ...newLayoutForm, [e.target.name]: e.target.value });
  };

  const handleCreateLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayoutForm.name.trim()) {
      toast.error('Layout name cannot be empty.');
      return;
    }

    try {
      const response = await api.post('/api/layouts', {
        name: newLayoutForm.name,
        // Default grid settings for new layouts
        grid: {
          cols: 12, 
          rowHeight: 30,
          layouts: {},
        },
        panes: [], // Start with no panes
      });
      setLayouts([response.data, ...layouts]); // Add new layout to the top
      setNewLayoutForm({ name: '' }); // Reset form
      setIsModalOpen(false);
      toast.success('Layout created successfully!');
    } catch (err: any) {
      console.error('Error creating layout:', err);
      toast.error(err.response?.data?.error || 'Failed to create layout.');
    }
  };

  const handleEditLayout = async (layout: Layout) => {
    setCurrentLayout(layout);
    setNewLayoutForm({ name: layout.name }); // Pre-fill form with current name
    setIsModalOpen(true);
  };

  const handleUpdateLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLayout || !newLayoutForm.name.trim()) {
      toast.error('Layout name cannot be empty.');
      return;
    }

    try {
      const response = await api.put(`/api/layouts/${currentLayout.id}`, {
        name: newLayoutForm.name,
        // We only update name via this form. Full pane/grid editing would be in the dashboard itself.
        // For now, we pass existing panes and grid to avoid losing data.
        panes: currentLayout.panes,
        grid: currentLayout.grid,
      });
      setLayouts(layouts.map(l => l.id === currentLayout.id ? response.data : l));
      setIsModalOpen(false);
      setCurrentLayout(null);
      setNewLayoutForm({ name: '' });
      toast.success('Layout updated successfully!');
    } catch (err: any) {
      console.error('Error updating layout:', err);
      toast.error(err.response?.data?.error || 'Failed to update layout.');
    }
  };

  const handleDeleteLayout = async (layoutId: string) => {
    if (window.confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
      try {
        await api.delete(`/api/layouts/${layoutId}`);
        setLayouts(layouts.filter(layout => layout.id !== layoutId));
        toast.success('Layout deleted successfully!');
      } catch (err: any) {
        console.error('Error deleting layout:', err);
        toast.error(err.response?.data?.error || 'Failed to delete layout.');
      }
    }
  };

  const handleSelectLayout = (layout: Layout) => {
    // This function would typically load the layout into the main dashboard
    // For now, we'll just show a toast and potentially navigate
    toast.info(`Loading layout: ${layout.name}`);
    // TODO: Implement logic to load this layout into the main dashboard state/UI
    // For now, let's assume we navigate to the dashboard after selecting
    navigate('/'); 
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requirePro={true}>
      <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
        <h1 className="text-4xl font-bold text-green-500 mb-8">Manage Layouts</h1>

        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
          >
            Create New Layout
          </button>
          {/* Add a button to go back to dashboard if needed */}
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {isLoading && <p className="text-center text-lg">Loading layouts...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!isLoading && !error && layouts.length === 0 && (
          <p className="text-center text-gray-400">You haven't created any layouts yet.</p>
        )}

        {!isLoading && !error && layouts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-green-500 mb-3">{layout.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Created: {new Date(layout.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-4 flex space-x-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleSelectLayout(layout)}
                    className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors text-sm"
                  >
                    Load Layout
                  </button>
                  <button
                    onClick={() => handleEditLayout(layout)}
                    className="px-4 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Edit Name
                  </button>
                  <button
                    onClick={() => handleDeleteLayout(layout.id)}
                    className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for creating/editing layout */} 
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 max-w-md w-full">
            <h2 className="text-3xl font-bold text-green-500 mb-6 text-center">
              {currentLayout ? 'Edit Layout Name' : 'Create New Layout'}
            </h2>
            <form onSubmit={currentLayout ? handleUpdateLayout : handleCreateLayout} className="space-y-6">
              <div>
                <label htmlFor="layoutName" className="block text-sm font-medium text-gray-300 mb-2">Layout Name</label>
                <input
                  id="layoutName"
                  name="name"
                  type="text"
                  required
                  value={newLayoutForm.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., My Trading Setup"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCurrentLayout(null);
                    setNewLayoutForm({ name: '' });
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
                >
                  {currentLayout ? 'Save Changes' : 'Create Layout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};
