import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { formatPrice } from '../utils/currency';
import { printContent } from '../utils/print';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference: '', notes: '' });
  const [itemForm, setItemForm] = useState({ item_type: 'other', description: '', quantity: 1, unit_price: '' });
  const [discountForm, setDiscountForm] = useState({ discount_type: 'fixed', discount_value: '' });
  const [settings, setSettings] = useState({});

  const rate = settings.exchange_rate || 4100;
  const fp = (v) => formatPrice(v, rate);

  useEffect(() => { api.get('/settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  const load = () => {
    api.get('/billing', { params: { search: search || undefined, status: statusFilter || undefined } })
      .then(r => setInvoices(r.data));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const viewInvoice = async (id) => {
    const res = await api.get(`/billing/${id}`);
    setSelected(res.data);
  };

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/billing/${selected.id}/payments`, payForm);
      toast.success('Payment recorded');
      setShowPayment(false);
      viewInvoice(selected.id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/billing/${selected.id}/items`, itemForm);
      toast.success('Item added');
      setShowAddItem(false);
      viewInvoice(selected.id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const applyDiscount = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/billing/${selected.id}/discount`, discountForm);
      toast.success('Discount applied');
      setShowDiscount(false);
      viewInvoice(selected.id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  if (selected) {
    const balance = selected.total - selected.paid_amount;
    const printInvoice = () => {
      const ghName = settings.guesthouse_name || 'HappyStay';
      printContent(`Invoice ${selected.invoice_number}`, `
        <div class="header"><h1>${ghName}</h1><p>វិក្កយបត្រ / Invoice</p></div>
        <div class="info-grid">
          <div>វិក្កយបត្រ: <strong>${selected.invoice_number}</strong></div>
          <div>ភ្ញៀវ: <strong>${selected.first_name} ${selected.last_name}</strong></div>
          <div>Ref: <strong>${selected.booking_ref || '-'}</strong></div>
          <div>បន្ទប់: <strong>${selected.room_number || '-'} (${selected.building_name || ''})</strong></div>
          <div>ចូល: <strong>${selected.check_in_date || '-'}</strong></div>
          <div>ចេញ: <strong>${selected.check_out_date || '-'}</strong></div>
        </div>
        <table><thead><tr><th>បរិយាយ</th><th style="text-align:center">ចំនួន</th><th style="text-align:right">តម្លៃ</th><th style="text-align:right">សរុប</th></tr></thead><tbody>
        ${(selected.items || []).map(i => `<tr><td>${i.description}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fp(i.unit_price)}</td><td style="text-align:right">${fp(i.total_price)}</td></tr>`).join('')}
        </tbody></table>
        <div class="total-section">
          <p>សរុបរង: <strong>${fp(selected.subtotal)}</strong></p>
          ${selected.discount_amount > 0 ? `<p>បញ្ចុះតម្លៃ: -${fp(selected.discount_amount)}</p>` : ''}
          <p class="grand-total">សរុប: ${fp(selected.total)}</p>
          <p>បានបង់: ${fp(selected.paid_amount)}</p>
          ${balance > 0 ? `<p style="color:#c62828">នៅជំពាក់: ${fp(balance)}</p>` : ''}
        </div>
        ${(selected.payments || []).length > 0 ? `
          <h2>ការទូទាត់</h2>
          <table><thead><tr><th>ថ្ងៃ</th><th>វិធី</th><th style="text-align:right">ចំនួន</th></tr></thead><tbody>
          ${selected.payments.map(p => `<tr><td>${p.payment_date}</td><td>${p.payment_method}</td><td style="text-align:right">${fp(p.amount)}</td></tr>`).join('')}
          </tbody></table>
        ` : ''}
        <div class="sig-area"><div class="sig-line"><div>ហត្ថលេខាភ្ញៀវ</div></div><div class="sig-line"><div>អ្នកទទួលភ្ញៀវ</div></div></div>
        <div class="footer">${settings.invoice_footer || 'អរគុណ!'}</div>
      `);
    };

    return (
      <div>
        <div className="flex gap-2 mb-2">
          <button className="btn btn-outline" onClick={() => setSelected(null)}>&larr; ត្រឡប់</button>
          <button className="btn btn-primary" onClick={printInvoice}>បោះពុម្ព វិក្កយបត្រ</button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>វិក្កយបត្រ {selected.invoice_number}</h3>
            <span className={`badge badge-${selected.status}`}>{selected.status}</span>
          </div>

          <div className="form-row mb-2">
            <div>
              <p><strong>Guest:</strong> {selected.first_name} {selected.last_name}</p>
              <p><strong>Booking:</strong> {selected.booking_ref || 'N/A'}</p>
              <p><strong>Room:</strong> {selected.room_number || 'N/A'} ({selected.building_name || ''})</p>
            </div>
            <div>
              <p><strong>Check-in:</strong> {selected.check_in_date?.split('T')[0] || 'N/A'}</p>
              <p><strong>Check-out:</strong> {selected.check_out_date?.split('T')[0] || 'N/A'}</p>
            </div>
          </div>

          <h4 style={{ margin: '16px 0 8px' }}>Items</h4>
          <table>
            <thead><tr><th>Type</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>
              {selected.items?.map(item => (
                <tr key={item.id}>
                  <td><span className="badge badge-pending">{item.item_type}</span></td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{fp(item.unit_price)}</td>
                  <td>{fp(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 15 }}>
            <p>សរុបរង: <strong>{fp(selected.subtotal)}</strong></p>
            {selected.discount_amount > 0 && <p>បញ្ចុះតម្លៃ: <strong>-{fp(selected.discount_amount)}</strong></p>}
            <p style={{ fontSize: 18 }}>សរុប: <strong>{fp(selected.total)}</strong></p>
            <p>បានបង់: <strong>{fp(selected.paid_amount)}</strong></p>
            {balance > 0 && <p style={{ color: '#e53935' }}>នៅជំពាក់: <strong>{fp(balance)}</strong></p>}
          </div>

          <div className="flex gap-2 mt-2">
            {selected.status !== 'paid' && (
              <>
                <button className="btn btn-success" onClick={() => { setPayForm({ amount: balance > 0 ? balance : '', payment_method: 'cash', reference: '', notes: '' }); setShowPayment(true); }}>Record Payment</button>
                <button className="btn btn-secondary" onClick={() => { setItemForm({ item_type: 'other', description: '', quantity: 1, unit_price: '' }); setShowAddItem(true); }}>Add Charge</button>
                <button className="btn btn-outline" onClick={() => { setDiscountForm({ discount_type: 'fixed', discount_value: '' }); setShowDiscount(true); }}>Apply Discount</button>
              </>
            )}
          </div>

          <h4 style={{ margin: '24px 0 8px' }}>Payments</h4>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received By</th></tr></thead>
            <tbody>
              {selected.payments?.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleString()}</td>
                  <td>{fp(p.amount)}</td>
                  <td>{p.payment_method}</td>
                  <td>{p.reference || '-'}</td>
                  <td>{p.received_by_name || '-'}</td>
                </tr>
              ))}
              {(!selected.payments || selected.payments.length === 0) && (
                <tr><td colSpan={5} className="text-center" style={{ color: '#999' }}>No payments recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Modal */}
        {showPayment && (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowPayment(false))(); }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <h3>Record Payment</h3>
              <form onSubmit={addPayment}>
                <div className="form-row">
                  <div className="form-group"><label>Amount</label><input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required /></div>
                  <div className="form-group">
                    <label>Method</label>
                    <select value={payForm.payment_method} onChange={e => setPayForm({...payForm, payment_method: e.target.value})}>
                      <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="qr_code">QR Code</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Reference</label><input value={payForm.reference} onChange={e => setPayForm({...payForm, reference: e.target.value})} /></div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-success">Record</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowAddItem(false))(); }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <h3>Add Charge</h3>
              <form onSubmit={addItem}>
                <div className="form-group">
                  <label>Type</label>
                  <select value={itemForm.item_type} onChange={e => setItemForm({...itemForm, item_type: e.target.value})}>
                    <option value="laundry">Laundry</option><option value="parking">Parking</option>
                    <option value="minibar">Minibar</option><option value="room_service">Room Service</option>
                    <option value="extra_person">Extra Person</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group"><label>Description</label><input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Quantity</label><input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} /></div>
                  <div className="form-group"><label>Unit Price</label><input type="number" step="0.01" value={itemForm.unit_price} onChange={e => setItemForm({...itemForm, unit_price: e.target.value})} required /></div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Add</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Discount Modal */}
        {showDiscount && (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowDiscount(false))(); }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <h3>Apply Discount</h3>
              <form onSubmit={applyDiscount}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={discountForm.discount_type} onChange={e => setDiscountForm({...discountForm, discount_type: e.target.value})}>
                      <option value="fixed">Fixed Amount</option><option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{discountForm.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}</label>
                    <input type="number" step="0.01" value={discountForm.discount_value} onChange={e => setDiscountForm({...discountForm, discount_value: e.target.value})} required />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Apply</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDiscount(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <div className="flex gap-2 items-center">
          <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: 280 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">All Status</option>
            <option value="open">Open</option><option value="partial">Partial</option><option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Invoice</th><th>Guest</th><th>Booking</th><th>Room</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><strong>{inv.invoice_number}</strong></td>
                  <td>{inv.first_name} {inv.last_name}</td>
                  <td>{inv.booking_ref || '-'}</td>
                  <td>{inv.room_number || '-'}</td>
                  <td>{fp(inv.total)}</td>
                  <td>{fp(inv.paid_amount)}</td>
                  <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => viewInvoice(inv.id)}>View</button></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={8} className="text-center" style={{ color: '#999', padding: 40 }}>No invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
