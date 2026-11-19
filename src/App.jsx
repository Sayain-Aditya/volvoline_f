import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewInvoice from './pages/NewInvoice';
import EditInvoice from './pages/EditInvoice';
import InvoiceSplitView from './components/proforma/InvoiceSplitView';
import GstInvoiceSplitView from './components/invoice/InvoiceSplitView';

const NAV = [
  { to: '/', label: 'Dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { to: '/invoice', label: 'New Quotation', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
  { to: '/proforma', label: 'New Proforma', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )},
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { pathname } = useLocation();

  return (
    <aside className={`print:hidden h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">MKS Alliance</span>
            <span className="text-[10px] text-gray-400">Invoice Manager</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />}
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV.map(({ to, label, icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {icon}
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-700">
        {!collapsed && <p className="text-[10px] text-gray-500 text-center">MKS Alliance LLP</p>}
      </div>
    </aside>
  );
};

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen bg-gray-100 print:block print:h-auto">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block">
        {children}
      </div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewInvoice />} />
        <Route path="/edit/:id" element={<EditInvoice />} />
        <Route path="/invoice" element={<GstInvoiceSplitView />} />
        <Route path="/invoice/:id" element={<GstInvoiceSplitView />} />
        <Route path="/proforma" element={<InvoiceSplitView />} />
        <Route path="/proforma/:id" element={<InvoiceSplitView />} />
      </Routes>
    </Layout>
  </BrowserRouter>
);

export default App;
