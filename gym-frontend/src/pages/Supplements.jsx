import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ShoppingBag, Plus, X, Loader2, Search,
  Package, AlertTriangle, CheckCircle
} from 'lucide-react';
import useDialog from '../hooks/useDialog';

const API_SUPP = 'http://localhost:5000/api/supplements';
const API_MEM = 'http://localhost:5000/api/members';

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const initialFormState = {
  member_id: '', supplement_id: '', quantity: 1,
  sale_date: new Date().toISOString().split('T')[0], payment_method: 'Card'
};
const initialRestockState = { supplement_id: '', quantity: 1 };

const STOCK_COLORS = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
};

function stockLevel(qty) {
  if (qty > 40) return 'high';
  if (qty > 10) return 'medium';
  return 'low';
}

function formatINR(value) {
  const amount = Number(value) || 0;
  return `₹${amount.toFixed(2)}`;
}

export default function Supplements() {
  const [data, setData] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const modalDialogRef = useDialog(showModal, () => setShowModal(false));
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestockModal, setShowRestockModal] = useState(false);
  const restockModalDialogRef = useDialog(showRestockModal, () => setShowRestockModal(false));
  const [restockData, setRestockData] = useState(initialRestockState);
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockError, setRestockError] = useState('');

  const fetchMembers = async () => {
    try {
      const memRes = await axios.get(API_MEM, { headers: getHeaders() });
      const memData = Array.isArray(memRes.data) ? memRes.data : [];
      setMembers(memData);
    } catch (err) { console.error('Failed to load members', err); }
  };

  const fetchData = async () => {
    try {
      const [suppRes, memRes] = await Promise.all([
        axios.get(API_SUPP, { headers: getHeaders() }),
        axios.get(API_MEM, { headers: getHeaders() })
      ]);
      setData(Array.isArray(suppRes.data) ? suppRes.data : []);
      const memData = Array.isArray(memRes.data) ? memRes.data : [];
      setMembers(memData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);


  const handleSale = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    try {
      const selectedSupp = data.find(s => s.supplement_id === parseInt(formData.supplement_id));
      if (!selectedSupp) { setModalError('Please select a valid supplement.'); setIsSubmitting(false); return; }

      const total_amount = selectedSupp.price * formData.quantity;
      await axios.post(`${API_SUPP}/sale`, { ...formData, total_amount }, { headers: getHeaders() });
      setShowModal(false);
      setFormData(initialFormState);
      fetchData();
      setSuccessMsg('Sale recorded successfully! Stock updated via trigger.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to record sale. Insufficient stock?');
    } finally { setIsSubmitting(false); }
  };

  const openRestockModal = (supplementId = '') => {
    setRestockData({ supplement_id: supplementId ? String(supplementId) : '', quantity: 1 });
    setRestockError('');
    setShowRestockModal(true);
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    setRestockSubmitting(true);
    setRestockError('');
    try {
      await axios.put(`${API_SUPP}/${restockData.supplement_id}/restock`, { quantity: restockData.quantity }, { headers: getHeaders() });
      setShowRestockModal(false);
      setRestockData(initialRestockState);
      fetchData();
      setSuccessMsg('Supplement restocked successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setRestockError(err.response?.data?.error || 'Failed to restock supplement.');
    } finally {
      setRestockSubmitting(false);
    }
  };

  const previewSupplement = data.find(s => s.supplement_id === parseInt(formData.supplement_id));
  const previewTotal = previewSupplement ? (previewSupplement.price * formData.quantity) : 0;

  const filtered = data.filter(s =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStock = data.reduce((sum, s) => sum + (s.stock_quantity || 0), 0);
  const lowStockCount = data.filter(s => s.stock_quantity <= 10).length;

  return (
    <div className="space-y-6 pb-12 font-manrope">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-space font-bold tracking-tighter text-white mb-2">Supplements</h2>
          <p className="text-iron-text-secondary font-medium italic text-sm">{data.length} products · {totalStock} units in stock</p>
        </div>
        <button onClick={() => { setShowModal(true); setModalError(''); fetchMembers(); }} className="btn flex items-center gap-2">
          <Plus size={14} /> Record Sale
        </button>
        <button onClick={() => openRestockModal()} className="px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-xs font-black tracking-widest text-white hover:bg-white/5 transition-all">
          Restock
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div role="status" className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
          <CheckCircle size={14} /> {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Total Products</p>
          <p className="text-4xl font-space font-black text-white">{data.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Total Stock</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-space font-black text-white">{totalStock}</p>
            <span className="text-iron-text-secondary text-xs mb-1">units</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Low Stock Alerts</p>
          <p className={`text-4xl font-space font-black ${lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{lowStockCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary mb-3">Avg Price</p>
          <div className="flex items-end gap-1">
            <p className="text-4xl font-space font-black text-white">
              {data.length > 0 ? formatINR(data.reduce((s, d) => s + parseFloat(d.price), 0) / data.length) : formatINR(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within:text-iron-lime transition-colors" />
          <input type="text" placeholder="Search supplements by name or brand..." aria-label="Search supplements"
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-iron-lime/20 focus:bg-white/[0.05] transition-all"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 size={20} className="animate-spin text-iron-lime mx-auto mb-3" />
            <p className="text-iron-text-secondary text-xs font-space tracking-widest">Loading inventory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-iron-text-secondary italic">No supplements found.</div>
        ) : (
          filtered.map(item => {
            const level = stockLevel(item.stock_quantity);
            const pct = Math.min((item.stock_quantity / 100) * 100, 100);
            return (
              <div key={item.supplement_id} className="card group hover:border-iron-lime/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-iron-lime/10 flex items-center justify-center text-iron-lime group-hover:scale-110 transition-transform">
                    <Package size={20} />
                  </div>
                  <span className="text-iron-text-secondary text-xs font-black tracking-widest font-space">#{item.supplement_id}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-1 group-hover:text-iron-lime transition-colors">{item.name}</h3>
                <p className="text-iron-text-secondary text-xs italic mb-4">{item.brand || 'Unknown Brand'}</p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-space font-black text-sm">₹</span>
                    <span className="text-white font-space font-bold text-lg">{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {level === 'low' && <AlertTriangle size={12} className="text-red-400" />}
                    <span className={`text-sm font-space font-bold ${STOCK_COLORS[level]}`}>{item.stock_quantity}</span>
                    <span className="text-iron-text-secondary text-xs">units</span>
                  </div>
                </div>

                {/* Stock bar */}
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    level === 'high' ? 'bg-emerald-400' : level === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                  }`} style={{ width: `${pct}%` }} />
                </div>
                <button
                  onClick={() => openRestockModal(item.supplement_id)}
                  className="mt-4 w-full py-2 bg-white/[0.03] border border-white/10 rounded-lg text-xs font-black tracking-widest text-iron-text-secondary hover:text-white hover:border-iron-lime/30 transition-all"
                >
                  Restock
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Record Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div ref={modalDialogRef} role="dialog" aria-modal="true" aria-labelledby="supplements-showModal-title" tabIndex={-1} className="bg-surface border border-border rounded-xl w-full max-w-md relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between">
              <div>
                <h2 id="supplements-showModal-title" className="text-xl font-bold text-white">Record Sale</h2>
                <p className="text-iron-text-secondary text-xs italic mt-1">Stock auto-updated via trg_supplement_stock_update trigger</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowModal(false)} className="text-iron-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="w-full h-px bg-white/5" />

            <form onSubmit={handleSale} className="p-6 space-y-4">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
              {modalError && (
                <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3">
                  <AlertTriangle size={14} className="shrink-0" /> {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="supplements-member-id" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Member <span aria-hidden="true" className="text-red-400">*</span></label>
                <select id="supplements-member-id" required value={formData.member_id} onChange={e => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30">
                  <option value="">Select member...</option>
                  {members.map(m => (
                    <option key={m.member_id} value={m.member_id}>{m.member_name || m.name} (ID: {m.member_id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supplements-supplement-id" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Supplement <span aria-hidden="true" className="text-red-400">*</span></label>
                <select id="supplements-supplement-id" required value={formData.supplement_id} onChange={e => setFormData({ ...formData, supplement_id: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30">
                  <option value="">Select supplement...</option>
                  {data.map(s => (
                    <option key={s.supplement_id} value={s.supplement_id}>
                      {s.name} ({formatINR(s.price)}) — {s.stock_quantity} left
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="supplements-quantity" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Quantity <span aria-hidden="true" className="text-red-400">*</span></label>
                  <input id="supplements-quantity" required type="number" min="1" max={previewSupplement ? previewSupplement.stock_quantity : 99}
                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="supplements-payment-method" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Payment</label>
                  <select id="supplements-payment-method" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30">
                    <option>Card</option><option>Cash</option><option>UPI</option><option>Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supplements-sale-date" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Sale Date <span aria-hidden="true" className="text-red-400">*</span></label>
                <input id="supplements-sale-date" required type="date" value={formData.sale_date} onChange={e => setFormData({ ...formData, sale_date: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30 [color-scheme:dark]" />
              </div>

              {/* Total preview */}
              {previewSupplement && (
                <div className="flex items-center justify-between p-4 bg-iron-lime/5 border border-iron-lime/20 rounded-xl">
                  <span className="text-iron-text-secondary text-xs font-bold tracking-widest">Total</span>
                  <span className="text-iron-lime font-space font-black text-xl">{formatINR(previewTotal)}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 btn flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                  {isSubmitting ? 'Processing...' : 'Record Sale'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-6 bg-white/[0.03] border border-white/10 rounded text-white text-xs font-space font-semibold tracking-wider hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRestockModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-md" onClick={() => setShowRestockModal(false)} />
          <div ref={restockModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="supplements-showRestockModal-title" tabIndex={-1} className="bg-surface border border-border rounded-xl w-full max-w-md relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between">
              <div>
                <h2 id="supplements-showRestockModal-title" className="text-xl font-bold text-white">Restock Supplement</h2>
                <p className="text-iron-text-secondary text-xs italic mt-1">Increase available inventory</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowRestockModal(false)} className="text-iron-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="w-full h-px bg-white/5" />

            <form onSubmit={handleRestock} className="p-6 space-y-4">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
              {restockError && (
                <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3">
                  <AlertTriangle size={14} className="shrink-0" /> {restockError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="supplements-supplement-id-2" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Supplement <span aria-hidden="true" className="text-red-400">*</span></label>
                <select id="supplements-supplement-id-2"
                  required
                  value={restockData.supplement_id}
                  onChange={e => setRestockData({ ...restockData, supplement_id: e.target.value })}
                  className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30"
                >
                  <option value="">Select supplement...</option>
                  {data.map(s => (
                    <option key={s.supplement_id} value={s.supplement_id}>
                      {s.name} ({s.stock_quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supplements-quantity-2" className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] block">Quantity to Add <span aria-hidden="true" className="text-red-400">*</span></label>
                <input id="supplements-quantity-2"
                  required
                  min="1"
                  type="number"
                  value={restockData.quantity}
                  onChange={e => setRestockData({ ...restockData, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-[#18181A] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-iron-lime/30"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={restockSubmitting} className="flex-1 btn flex items-center justify-center gap-2">
                  {restockSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {restockSubmitting ? 'Updating...' : 'Restock'}
                </button>
                <button type="button" onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-3 px-6 bg-white/[0.03] border border-white/10 rounded text-white text-xs font-space font-semibold tracking-wider hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
