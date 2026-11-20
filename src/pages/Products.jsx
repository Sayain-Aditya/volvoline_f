import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getProducts, createProduct, updateProduct, deleteProduct, bulkImportProducts } from '../api/productApi';

const empty = { name: '', hsn: '', unit: 'NOS', rate: '', desc: '' };

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

export default function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError('');
    try { setItems(await getProducts()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setForm(empty); setModal({ mode: 'add' }); };
  const openEdit = (item) => { setForm({ name: item.name, hsn: item.hsn, unit: item.unit, rate: item.rate, desc: item.desc }); setModal({ mode: 'edit', id: item._id }); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, rate: parseFloat(form.rate) || 0 };
      if (modal.mode === 'add') await createProduct(payload);
      else await updateProduct(modal.id, payload);
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await deleteProduct(id); load(); }
    catch (e) { setError(e.message); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.hsn?.toLowerCase().includes(search.toLowerCase())
  );

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const mapped = rows.map((r) => ({
        name: String(r['Item Name'] || r['name'] || '').trim(),
        hsn: String(r['HSN Code'] || r['hsn'] || '').trim(),
      })).filter((r) => r.name);
      if (mapped.length === 0) { setError('No valid rows found. Columns must be: Item Name, HSN Code'); return; }
      const res = await bulkImportProducts(mapped);
      load();
      setError('');
      alert(`✅ Imported ${res.inserted} products successfully.`);
    } catch (e) { setError(e.message); }
    finally { setImporting(false); e.target.value = ''; }
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6">
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalogue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage items to use in quotations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
          <button
            onClick={() => importRef.current.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
            {importing ? 'Importing…' : 'Import Excel'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Search by name or HSN…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /></svg>
          <p className="text-gray-400 text-sm">{search ? 'No products match your search.' : 'No products yet.'}</p>
          {!search && <button onClick={openAdd} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">Add first product</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">HSN/SAC</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Rate (₹)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{item.desc || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{item.hsn || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs transition-colors">Edit</button>
                      <button onClick={() => handleDelete(item._id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-800">{modal.mode === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name *</label>
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engine Oil 5W-30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <input className={inputCls} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">HSN/SAC</label>
                  <input className={inputCls} value={form.hsn} onChange={e => setForm(f => ({ ...f, hsn: e.target.value }))} placeholder="e.g. 27101990" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Unit</label>
                  <input className={inputCls} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value.toUpperCase() }))} placeholder="NOS" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rate (₹)</label>
                <input type="number" step="0.01" className={inputCls} value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
