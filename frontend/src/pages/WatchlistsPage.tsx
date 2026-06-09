import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../stores/authStore';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { toast } from 'react-toastify';
import Select from 'react-select'; // Assuming react-select for symbol input

interface Watchlist {
  id: string;
  name: string;
  userId: string;
  symbols: string[];
  createdAt: string;
  updatedAt: string;
}

interface WatchlistFormState {
  name: string;
  symbols: string[];
}

export const WatchlistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, isLoading: isAuthLoading, checkAuth } = useAuthStore();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWatchlist, setCurrentWatchlist] = useState<Watchlist | null>(null); // For editing
  const [newWatchlistForm, setNewWatchlistForm] = useState<WatchlistFormState>({
    name: '',
    symbols: [],
  });
  const [availableSymbols, setAvailableSymbols] = useState<{ value: string; label: string }[]>([]); // Dummy symbols for example

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
    // Fetch watchlists if user is available
    if (user) {
      fetchWatchlists();
    }
  }, [user]);

  // Dummy data for symbol selection - in a real app, this would come from a data source
  useEffect(() => {
    setAvailableSymbols([
      { value: 'AAPL', label: 'Apple Inc.' },
      { value: 'GOOGL', label: 'Alphabet Inc.' },
      { value: 'MSFT', label: 'Microsoft Corp.' },
      { value: 'AMZN', label: 'Amazon.com, Inc.' },
      { value: 'TSLA', label: 'Tesla, Inc.' },
      { value: 'BTC-USD', label: 'Bitcoin / USD' },
      { value: 'ETH-USD', label: 'Ethereum / USD' },
      // Add more relevant symbols
    ]);
  }, []);

  const fetchWatchlists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/watchlists');
      setWatchlists(response.data);
    } catch (err: any) {
      setError('Failed to fetch watchlists. Please try again later.');
      console.error('Error fetching watchlists:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewWatchlistForm({ ...newWatchlistForm, [e.target.name]: e.target.value });
  };

  const handleSymbolInputChange = (selectedOptions: any) => {
    setNewWatchlistForm({ ...newWatchlistForm, symbols: selectedOptions.map((option: any) => option.value) });
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistForm.name.trim()) {
      toast.error('Watchlist name cannot be empty.');
      return;
    }
    if (newWatchlistForm.symbols.length === 0) {
      toast.error('Watchlist must contain at least one symbol.');
      return;
    }

    try {
      const response = await api.post('/api/watchlists', {
        name: newWatchlistForm.name,
        symbols: newWatchlistForm.symbols,
      });
      setWatchlists([response.data, ...watchlists]); // Add new watchlist to the top
      setNewWatchlistForm({ name: '', symbols: [] }); // Reset form
      setIsModalOpen(false);
      toast.success('Watchlist created successfully!');
    } catch (err: any) {
      console.error('Error creating watchlist:', err);
      toast.error(err.response?.data?.error || 'Failed to create watchlist.');
    }
  };

  const handleEditWatchlist = async (watchlist: Watchlist) => {
    setCurrentWatchlist(watchlist);
    setNewWatchlistForm({ name: watchlist.name, symbols: watchlist.symbols });
    // Pre-select existing symbols in the react-select component
    // This needs to be done after the component is rendered, or managed via state
    setIsModalOpen(true);
  };

  const handleUpdateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWatchlist || !newWatchlistForm.name.trim()) {
      toast.error('Watchlist name cannot be empty.');
      return;
    }
    if (newWatchlistForm.symbols.length === 0) {
      toast.error('Watchlist must contain at least one symbol.');
      return;
    }

    try {
      const response = await api.put(`/api/watchlists/${currentWatchlist.id}`, {
        name: newWatchlistForm.name,
        symbols: newWatchlistForm.symbols,
      });
      setWatchlists(watchlists.map(wl => wl.id === currentWatchlist.id ? response.data : wl));
      setIsModalOpen(false);
      setCurrentWatchlist(null);
      setNewWatchlistForm({ name: '', symbols: [] });
      toast.success('Watchlist updated successfully!');
    } catch (err: any) {
      console.error('Error updating watchlist:', err);
      toast.error(err.response?.data?.error || 'Failed to update watchlist.');
    }
  };

  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (window.confirm('Are you sure you want to delete this watchlist? This action cannot be undone.')) {
      try {
        await api.delete(`/api/watchlists/${watchlistId}`);
        setWatchlists(watchlists.filter(wl => wl.id !== watchlistId));
        toast.success('Watchlist deleted successfully!');
      } catch (err: any) {
        console.error('Error deleting watchlist:', err);
        toast.error(err.response?.data?.error || 'Failed to delete watchlist.');
      }
    }
  };

  const handleLoadWatchlist = (watchlist: Watchlist) => {
    toast.info(`Loading watchlist: ${watchlist.name}`);
    // TODO: Implement logic to load this watchlist into the main dashboard/tracking system
    navigate('/'); // Navigate back to dashboard for now
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
        <h1 className="text-4xl font-bold text-green-500 mb-8">Manage Watchlists</h1>

        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
          >
            Create New Watchlist
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {isLoading && <p className="text-center text-lg">Loading watchlists...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!isLoading && !error && watchlists.length === 0 && (
          <p className="text-center text-gray-400">You haven't created any watchlists yet.</p>
        )}

        {!isLoading && !error && watchlists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlists.map((watchlist) => (
              <div
                key={watchlist.id}
                className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-green-500 mb-3">{watchlist.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Symbols: {watchlist.symbols.join(', ')}
                  </p>
                  <p className="text-sm text-gray-400">
                    Created: {new Date(watchlist.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-4 flex space-x-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleLoadWatchlist(watchlist)}
                    className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors text-sm"
                  >
                    Load Watchlist
                  </button>
                  <button
                    onClick={() => handleEditWatchlist(watchlist)}
                    className="px-4 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteWatchlist(watchlist.id)}
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

      {/* Modal for creating/editing watchlist */} 
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-green-500 mb-6 text-center">
              {currentWatchlist ? 'Edit Watchlist' : 'Create New Watchlist'}
            </h2>
            <form onSubmit={currentWatchlist ? handleUpdateWatchlist : handleCreateWatchlist} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Watchlist Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={newWatchlistForm.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., My Crypto Watchlist"
                />
              </div>
              
              <div>
                <label htmlFor="symbols" className="block text-sm font-medium text-gray-300 mb-2">Symbols</label>
                <Select
                  isMulti
                  name="symbols"
                  options={availableSymbols}
                  value={newWatchlistForm.symbols.map(sym => availableSymbols.find(opt => opt.value === sym))}
                  onChange={handleSymbolInputChange}
                  className="basic-multi-select"
                  classNamePrefix="react-select"
                  placeholder="Add symbols..."
                />
                <p className="mt-2 text-xs text-gray-500">Use the dropdown to add symbols. e.g., AAPL, BTC-USD</p>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCurrentWatchlist(null);
                    setNewWatchlistForm({ name: '', symbols: [] });
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-100 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
                >
                  {currentWatchlist ? 'Save Changes' : 'Create Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};
