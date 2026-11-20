import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice } from '../api/invoiceApi';

const inr = (n) => (isNaN(n) ? 0 : n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1`}>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
  </div>
);

const Badge = ({ children, color }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{children}</span>
);

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spFilter, setSpFilter] = useState('');

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setInvoices(await getInvoices());
    } catch (e) {
      setError(e.message || 'Failed to connect to server.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await deleteInvoice(id); refresh();
  };

  const salespersons = useMemo(() => {
    const names = invoices.map(i => i.salesperson?.name?.trim()).filter(Boolean);
    return [...new Set(names)].sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() =>
    spFilter ? invoices.filter(i => i.salesperson?.name?.trim() === spFilter) : invoices
  , [invoices, spFilter]);

  const totalGst = filteredInvoices.reduce((s, i) => s + (i.totals?.total || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button onClick={refresh} className="ml-auto font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your quotations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/invoice" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Quotation
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label={spFilter ? `${spFilter}'s Quotations` : 'GST Quotations'} value={filteredInvoices.length} color="text-indigo-600" />
        <StatCard label={spFilter ? `${spFilter}'s Total` : 'GST Total'} value={`₹${inr(totalGst)}`} color="text-green-600" />
      </div>

      {/* Salesperson filter */}
      {salespersons.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium text-gray-600 shrink-0">Salesperson:</label>
          <select
            value={spFilter}
            onChange={e => setSpFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All</option>
            {salespersons.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {spFilter && (
            <button onClick={() => setSpFilter('')} className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
        </div>
      )}

      {/* Tabs */}
      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-gray-400 text-sm">No GST quotations yet.</p>
            <Link to="/invoice" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">Create first quotation</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Quotation No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Buyer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Salesperson</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">{inv.meta?.invoiceNo || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.buyer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.salesperson?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.meta?.date || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {inv.totals?.total != null ? `₹${Number(inv.totals.total).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/invoice/${inv._id}`} className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs transition-colors">Edit</Link>
                        <button onClick={() => handleDelete(inv._id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
};

export default Dashboard;
