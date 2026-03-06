import { Routes, Route, NavLink } from 'react-router-dom';
import DealForm from './pages/DealForm';
import ResultsDashboard from './pages/ResultsDashboard';
import RenovationBudget from './pages/RenovationBudget';
import PhotoWalkthrough from './pages/PhotoWalkthrough';
import ComparisonView from './pages/ComparisonView';
import LeadTracker from './pages/LeadTracker';

const navItems = [
  { path: '/', label: 'New Deal', icon: '+' },
  { path: '/deals', label: 'My Deals', icon: '#' },
  { path: '/leads', label: 'Leads', icon: '@' },
  { path: '/compare', label: 'Compare', icon: '=' },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-lg text-gray-800">RE Calculator</span>
            </div>
            <div className="flex gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<DealForm />} />
          <Route path="/deals" element={<ResultsDashboard />} />
          <Route path="/deals/:id" element={<ResultsDashboard />} />
          <Route path="/deals/:id/renovation" element={<RenovationBudget />} />
          <Route path="/deals/:id/photos" element={<PhotoWalkthrough />} />
          <Route path="/leads" element={<LeadTracker />} />
          <Route path="/compare" element={<ComparisonView />} />
        </Routes>
      </main>
    </div>
  );
}
