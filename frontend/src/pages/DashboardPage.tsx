import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../stores/authStore';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { toast } from 'react-toastify';

// Import react-grid-layout components
import { Responsive, WidthProvider, Layout as ReactGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Import functional components for panes
import { TerminalPane } from '../components/Dashboard/TerminalPane'; // Import the new functional TerminalPane
import { ChartPane } from '../components/Dashboard/ChartPane'; // Import the new functional ChartPane

// Placeholder components for other pane types (if not yet implemented)
const NewsPane = ({ id, name }: { id: string; name: string }) => {
  return (
    <div className="bg-gray-800 p-4 h-full flex flex-col justify-center items-center rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-green-500 mb-2">{name}</h3>
      <div className="w-full h-32 bg-gray-700 rounded mt-2 animate-pulse"></div>
    </div>
  );
};

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, isLoading: isAuthLoading, layouts, watchlists, checkAuth, logout, fetchUserData } = useAuthStore();
  
  const [currentLayoutConfig, setCurrentLayoutConfig] = useState<ReactGridLayout[] | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [selectedLayoutName, setSelectedLayoutName] = useState<string | null>(null);
  const [showWatchlists, setShowWatchlists] = useState(false);

  useEffect(() => {
    // Ensure user is authenticated
    if (accessToken && !user) {
      checkAuth();
    }
    // If not authenticated after checks, redirect to login
    if (!accessToken && !isAuthLoading) {
      navigate('/login');
    }
  }, [accessToken, user, isAuthLoading, checkAuth, navigate]);

  // Fetch user data (layouts, watchlists) if user is available and data is not yet loaded
  useEffect(() => {
    if (user && (layouts.length === 0 || watchlists.length === 0)) {
      fetchUserData();
    }
  }, [user, fetchUserData, layouts, watchlists]);

  // Effect to load the default or first layout when data is ready
  useEffect(() => {
    if (user && layouts.length > 0) {
      // Find a default layout or use the first one available, or the one currently selected
      const layoutToLoad = layouts.find(l => l.name === 'Default Layout') || 
                           layouts.find(l => l.name === selectedLayoutName) || 
                           layouts[0];
      if (layoutToLoad) {
        loadLayoutIntoState(layoutToLoad);
        setSelectedLayoutName(layoutToLoad.name);
      }
      setIsDashboardLoading(false);
    } else if (layouts.length === 0 && !isDashboardLoading) {
      // If no layouts exist, set a default state and stop loading
      setIsDashboardLoading(false);
    }
  }, [layouts, user, isDashboardLoading, selectedLayoutName]); // Dependency on layouts ensures it loads when fetched

  const loadLayoutIntoState = (layout) => {
    let mappedLayout: ReactGridLayout[] = [];
    if (layout.grid && typeof layout.grid.layouts === 'object' && layout.grid.layouts !== null) {
      const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
      for (const bp of breakpoints) {
        if (layout.grid.layouts[bp] && Array.isArray(layout.grid.layouts[bp])) {
          mappedLayout.push({
            [bp]: layout.grid.layouts[bp].map((item: any) => ({ ...item, i: item.i.toString() })),
          });
        }
      }
    }
    
    if (mappedLayout.length === 0) {
      mappedLayout.push({
        lg: [
          { i: '1', x: 0, y: 0, w: 6, h: 6, componentType: 'terminal', name: 'Welcome Terminal', symbol: 'GMID' },
        ],
      });
    }
    setCurrentLayoutConfig(mappedLayout);
  };

  const renderPane = (layoutItem: any) => {
    const paneType = layoutItem.componentType || 'terminal';
    const paneName = layoutItem.name || `Pane ${layoutItem.i}`;
    const paneSymbol = layoutItem.symbol;

    switch (paneType) {
      case 'terminal':
        return <TerminalPane id={layoutItem.i} name={paneName} symbol={paneSymbol} />;
      case 'chart':
        return <ChartPane id={layoutItem.i} name={paneName} symbol={paneSymbol} />;
      case 'news':
        return <NewsPane id={layoutItem.i} name={paneName} />;
      default:
        return <div className="bg-red-500 p-4 rounded-lg">Unknown Pane Type</div>;
    }
  };

  const onLayoutChange = (newLayout: ReactGridLayout[]) => {
    console.log('Layout changed:', newLayout);
    // Auto-save logic would go here
  };

  const handleSelectLayout = (layoutName: string) => {
    const layout = layouts.find(l => l.name === layoutName);
    if (layout) {
      loadLayoutIntoState(layout);
      setSelectedLayoutName(layout.name);
      toast.success(`Loaded layout: ${layout.name}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Loading state for initial auth check and data fetching
  if (isAuthLoading || (user && layouts.length === 0 && isDashboardLoading)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If user is logged in but has no layouts, prompt to create one
  if (user && layouts.length === 0 && !isDashboardLoading) {
    return (
      <ProtectedRoute requirePro={true}>
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-gray-100">
          <h1 className="text-3xl font-bold text-green-500 mb-4">Welcome to your Dashboard!</h1>
          <p className="text-lg text-gray-400 mb-6">It looks like you haven't created any layouts yet.</p>
          <button
            onClick={() => navigate('/layouts')}
            className="px-6 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
          >
            Create Your First Layout
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  const toggleWatchlists = () => {
    setShowWatchlists(!showWatchlists);
  };

  return (
    <ProtectedRoute requirePro={true}>
      <div className="bg-gray-900 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700 px-6">
          <div className="flex items-center">
            <h1 className="text-4xl font-bold text-green-500 mr-6">GM Terminal</h1>
            <nav className="flex space-x-4 text-gray-300">
              <button onClick={() => navigate('/')} className="hover:text-green-400 transition-colors">Dashboard</button>
              <button onClick={() => navigate('/layouts')} className="hover:text-green-400 transition-colors">Layouts</button>
              <button onClick={() => navigate('/watchlists')} className="hover:text-green-400 transition-colors">Watchlists</button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {user?.name || user?.email.split('@')[0]}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors">Logout</button>
          </div>
        </header>
        
        <main className="flex-grow relative flex">
          {/* Watchlist Sidebar */}
          <aside className={`w-64 bg-gray-800 border-r border-gray-700 p-4 transition-all duration-300 ease-in-out ${showWatchlists ? 'translate-x-0' : '-translate-x-64'} lg:translate-x-0 z-10`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-green-500">Watchlists</h2>
              <button onClick={toggleWatchlists} className="lg:hidden text-gray-400 hover:text-green-400">
                {showWatchlists ? '◀' : '▶'}
              </button>
            </div>
            <ul className="space-y-3">
              {watchlists.length === 0 ? (
                <li className="text-gray-500">No watchlists yet.</li>
              ) : (
                watchlists.map((wl) => (
                  <li key={wl.id} className="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer transition-colors">
                    <button onClick={() => toast.info(`Loading watchlist: ${wl.name}`)} className="text-left flex-grow text-gray-300 hover:text-green-400">
                      {wl.name}
                    </button>
                    <span className="text-xs text-gray-500 ml-2">({wl.symbols.length})</span>
                  </li>
                ))
              )}
            </ul>
            <button onClick={() => navigate('/watchlists')} className="mt-4 w-full px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors text-sm">Manage Watchlists</button>
          </aside>
          
          {/* Main Dashboard Area */}
          <div className="flex-grow relative p-4">
            <div className="flex justify-between items-center mb-4">
              <select 
                value={selectedLayoutName || ''}
                onChange={(e) => handleSelectLayout(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="" disabled>Select a layout</option>
                {layouts.map(layout => (
                  <option key={layout.id} value={layout.name}>{layout.name}</option>
                ))}
              </select>
              <button
                onClick={() => toast.info('Feature coming soon: Add new panes!')}
                className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-500 transition-colors"
              >
                Add Pane
              </button>
            </div>

            {isDashboardLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <ResponsiveGridLayout
                className="layout"
                layouts={currentLayoutConfig ? {
                  lg: currentLayoutConfig.find(bp => bp.lg)?.lg || [],
                  md: currentLayoutConfig.find(bp => bp.md)?.md || [],
                  sm: currentLayoutConfig.find(bp => bp.sm)?.sm || [],
                  xs: currentLayoutConfig.find(bp => bp.xs)?.xs || [],
                  xxs: currentLayoutConfig.find(bp => bp.xxs)?.xxs || [],
                } : { lg: [] }}
                cols={layouts.find(l => l.name === selectedLayoutName)?.grid.cols || 12} 
                rowHeight={layouts.find(l => l.name === selectedLayoutName)?.grid.rowHeight || 30} 
                onLayoutChange={onLayoutChange}
                isDraggable={true}
                isResizable={true}
                margin={{lg: [10, 10], md: [10, 10], sm: [10, 10], xs: [5, 5], xxs: [5, 5]}}
                containerPadding={{lg: [10, 10], md: [10, 10], sm: [10, 10], xs: [5, 5], xxs: [5, 5]}}
              >
                {currentLayoutConfig && currentLayoutConfig[0]?.lg.map(item => (
                  <div key={item.i} className="relative">
                    {renderPane({ ...item, name: `${selectedLayoutName || 'Dashboard'} - Pane ${item.i}`, symbol: item.symbol })}
                  </div>
                ))}
              </ResponsiveGridLayout>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};
