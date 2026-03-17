import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import GuestSearch from '../components/GuestSearch';
import { formatPrice } from '../utils/currency';
import { printContent } from '../utils/print';

export default function Restaurant() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'restaurant');
  const [tab, setTab] = useState('orders');
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', category: 'food', price: '', description: '' });
  const [orderForm, setOrderForm] = useState({ order_type: 'outside', room_id: '', reservation_id: '', customer_name: '', notes: '' });
  const [orderItems, setOrderItems] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState(null);
  const [settings, setSettings] = useState({});
  const rate = settings.exchange_rate || 4100;
  const fp = (v) => formatPrice(v, rate);

  const loadMenu = () => api.get('/restaurant/menu').then(r => setMenu(r.data));
  const loadOrders = () => api.get('/restaurant/orders').then(r => setOrders(r.data));

  useEffect(() => { loadMenu(); loadOrders(); api.get('/settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  // Menu
  const openAddMenu = () => { setEditItem(null); setMenuForm({ name: '', category: 'food', price: '', description: '' }); setShowMenuModal(true); };
  const openEditMenu = (item) => { setEditItem(item); setMenuForm({ name: item.name, category: item.category, price: item.price, description: item.description || '' }); setShowMenuModal(true); };

  const saveMenu = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/restaurant/menu/${editItem.id}`, { ...menuForm, is_available: editItem.is_available });
      } else {
        await api.post('/restaurant/menu', menuForm);
      }
      toast.success(editItem ? 'Menu item updated' : 'Menu item added');
      setShowMenuModal(false);
      loadMenu();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const toggleAvailable = async (item) => {
    await api.put(`/restaurant/menu/${item.id}`, { ...item, is_available: !item.is_available });
    loadMenu();
  };

  const deleteMenu = async () => {
    if (!confirmDeleteMenu) return;
    await api.delete(`/restaurant/menu/${confirmDeleteMenu}`);
    toast.success('Deleted');
    setConfirmDeleteMenu(null);
    loadMenu();
  };

  // Orders
  const openNewOrder = async () => {
    setOrderForm({ order_type: 'outside', room_id: '', reservation_id: '', customer_name: 'Walk-in customer', notes: '' });
    setOrderItems([]);
    // Load active rooms for room_bill option
    try {
      const res = await api.get('/reservations', { params: { status: 'checked_in' } });
      setActiveRooms(res.data);
    } catch {}
    setShowOrderModal(true);
  };

  const addToOrder = (menuItem) => {
    const existing = orderItems.find(i => i.menu_item_id === menuItem.id);
    if (existing) {
      setOrderItems(orderItems.map(i => i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems([...orderItems, { menu_item_id: menuItem.id, name: menuItem.name, quantity: 1, unit_price: menuItem.price }]);
    }
  };

  const removeFromOrder = (menuItemId) => {
    setOrderItems(orderItems.filter(i => i.menu_item_id !== menuItemId));
  };

  const orderTotal = orderItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) { toast.error('Add items to the order'); return; }
    try {
      const payload = { ...orderForm, items: orderItems };
      if (orderForm.order_type === 'room_bill' && orderForm.reservation_id) {
        const stay = activeRooms.find(r => r.id === parseInt(orderForm.reservation_id));
        if (stay) payload.room_id = stay.room_id;
      }
      await api.post('/restaurant/orders', payload);
      toast.success('Order created');
      setShowOrderModal(false);
      loadOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const updateOrderStatus = async (id, status, payment_method) => {
    await api.patch(`/restaurant/orders/${id}/status`, { status, payment_method });
    toast.success('Status updated');
    loadOrders();
    if (orderDetail?.id === id) {
      const res = await api.get(`/restaurant/orders/${id}`);
      setOrderDetail(res.data);
    }
  };

  const viewOrder = async (id) => {
    const res = await api.get(`/restaurant/orders/${id}`);
    setOrderDetail(res.data);
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('orders')}>Orders</button>
        <button className={`btn ${tab === 'menu' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('menu')}>Menu</button>
      </div>

      {tab === 'menu' && (
        <div>
          {canManage && (
            <div className="toolbar"><div /><button className="btn btn-primary" onClick={openAddMenu}>+ Add Item</button></div>
          )}
          {['food', 'drinks', 'snacks'].map(cat => {
            const items = menu.filter(m => m.category === cat);
            if (items.length === 0) return null;
            return (
              <div className="card" key={cat}>
                <div className="card-header"><h3 style={{ textTransform: 'capitalize' }}>{cat}</h3></div>
                <table>
                  <thead><tr><th>Name</th><th>Price</th><th>Available</th>{canManage && <th>Actions</th>}</tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{fp(item.price)}</td>
                        <td>
                          <span className={`badge ${item.is_available ? 'badge-available' : 'badge-maintenance'}`}>
                            {item.is_available ? 'Yes' : 'No'}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-sm btn-outline" onClick={() => toggleAvailable(item)}>Toggle</button>
                              <button className="btn btn-sm btn-outline" onClick={() => openEditMenu(item)}>Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteMenu(item.id)}>Del</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div className="toolbar">
            <div />
            {canManage && <button className="btn btn-primary" onClick={openNewOrder}>+ New Order</button>}
          </div>

          {orderDetail ? (
            <div className="card">
              <div className="flex gap-2 mb-2">
                <button className="btn btn-outline btn-sm" onClick={() => setOrderDetail(null)}>&larr; ត្រឡប់</button>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const ghName = settings.guesthouse_name || 'HappyStay';
                  printContent(`Order #${orderDetail.id}`, `
                    <div class="header"><h1>${ghName}</h1><p>បង្កាន់ដៃបញ្ជាទិញ / Order Receipt</p></div>
                    <div class="info-grid">
                      <div>លេខ: <strong>#${orderDetail.id}</strong></div>
                      <div>ប្រភេទ: <strong>${orderDetail.order_type}</strong></div>
                      <div>បន្ទប់: <strong>${orderDetail.room_number || '-'}</strong></div>
                      <div>អតិថិជន: <strong>${orderDetail.customer_name || '-'}</strong></div>
                    </div>
                    <table><thead><tr><th>មុខម្ហូប</th><th style="text-align:center">ចំនួន</th><th style="text-align:right">តម្លៃ</th><th style="text-align:right">សរុប</th></tr></thead><tbody>
                    ${(orderDetail.items || []).map(i => `<tr><td>${i.item_name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fp(i.unit_price)}</td><td style="text-align:right">${fp(i.total_price)}</td></tr>`).join('')}
                    </tbody></table>
                    <div class="total-section"><p class="grand-total">សរុប: ${fp(orderDetail.total)}</p></div>
                    <div class="footer">${settings.invoice_footer || 'អរគុណ!'}</div>
                  `);
                }}>បោះពុម្ព</button>
              </div>
              <div className="card-header">
                <h3>បញ្ជាទិញ #{orderDetail.id}</h3>
                <span className={`badge badge-${orderDetail.status}`}>{orderDetail.status}</span>
              </div>
              <p><strong>ប្រភេទ:</strong> {orderDetail.order_type} | <strong>បន្ទប់:</strong> {orderDetail.room_number || '-'} | <strong>អតិថិជន:</strong> {orderDetail.customer_name || '-'}</p>
              <table className="mt-1">
                <thead><tr><th>មុខម្ហូប</th><th>ចំនួន</th><th>តម្លៃ</th><th>សរុប</th></tr></thead>
                <tbody>
                  {orderDetail.items?.map(i => (
                    <tr key={i.id}><td>{i.item_name}</td><td>{i.quantity}</td><td>{fp(i.unit_price)}</td><td>{fp(i.total_price)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right mt-1" style={{ fontSize: 18 }}><strong>សរុប: {fp(orderDetail.total)}</strong></p>
              {canManage && orderDetail.status === 'pending' && (
                <div className="flex gap-2 mt-1">
                  <button className="btn btn-success" onClick={() => updateOrderStatus(orderDetail.id, 'served')}>Mark Served</button>
                </div>
              )}
              {canManage && orderDetail.status === 'served' && orderDetail.order_type !== 'room_bill' && (
                <div className="flex gap-2 mt-1">
                  <button className="btn btn-success" onClick={() => updateOrderStatus(orderDetail.id, 'paid', 'cash')}>Paid (Cash)</button>
                  <button className="btn btn-success" onClick={() => updateOrderStatus(orderDetail.id, 'paid', 'card')}>Paid (Card)</button>
                  <button className="btn btn-success" onClick={() => updateOrderStatus(orderDetail.id, 'paid', 'qr_code')}>Paid (QR)</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>#</th><th>Type</th><th>Room</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.id}</strong></td>
                        <td>{o.order_type}</td>
                        <td>{o.room_number || '-'}</td>
                        <td>{o.customer_name || '-'}</td>
                        <td>{fp(o.total)}</td>
                        <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                        <td>{new Date(o.created_at).toLocaleString()}</td>
                        <td><button className="btn btn-sm btn-outline" onClick={() => viewOrder(o.id)}>View</button></td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={8} className="text-center" style={{ color: '#999', padding: 40 }}>No orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowMenuModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            <form onSubmit={saveMenu}>
              <div className="form-group"><label>Name</label><input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}>
                    <option value="food">Food</option><option value="drinks">Drinks</option><option value="snacks">Snacks</option>
                  </select>
                </div>
                <div className="form-group"><label>Price</label><input type="number" step="0.01" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} required /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} rows={2} /></div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMenuModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowOrderModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h3>New Order</h3>
            <form onSubmit={submitOrder}>
              <div className="form-row">
                <div className="form-group">
                  <label>Order Type</label>
                  <select value={orderForm.order_type} onChange={e => setOrderForm({...orderForm, order_type: e.target.value})}>
                    <option value="outside">Outside Customer</option>
                    <option value="pay_now">Guest — Pay Now</option>
                    <option value="room_bill">Guest — Add to Room Bill</option>
                  </select>
                </div>
                {orderForm.order_type === 'room_bill' ? (
                  <div className="form-group">
                    <label>Room (Active Stay)</label>
                    <select value={orderForm.reservation_id} onChange={e => setOrderForm({...orderForm, reservation_id: e.target.value})} required>
                      <option value="">Select</option>
                      {activeRooms.map(r => <option key={r.id} value={r.id}>{r.room_number} — {r.first_name} {r.last_name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>ឈ្មោះអតិថិជន</label>
                    <GuestSearch
                      value={orderForm.customer_name}
                      onChange={(name) => setOrderForm({...orderForm, customer_name: name})}
                      onSelectGuest={(guest) => setOrderForm({...orderForm, customer_name: `${guest.first_name} ${guest.last_name}`})}
                      placeholder="វាយឈ្មោះដើម្បីស្វែងរក..."
                    />
                  </div>
                )}
              </div>

              <h4 style={{ margin: '12px 0 8px' }}>Menu</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {menu.filter(m => m.is_available).map(m => (
                  <button key={m.id} type="button" className="btn btn-outline" onClick={() => addToOrder(m)}
                    style={{ justifyContent: 'center', flexDirection: 'column', padding: 10, fontSize: 13 }}>
                    <span>{m.name}</span>
                    <small>{fp(m.price)}</small>
                  </button>
                ))}
              </div>

              {orderItems.length > 0 && (
                <>
                  <h4>Order Items</h4>
                  <table>
                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {orderItems.map(i => (
                        <tr key={i.menu_item_id}>
                          <td>{i.name}</td>
                          <td>
                            <input type="number" min="1" value={i.quantity} style={{ width: 60, padding: 4 }}
                              onChange={e => setOrderItems(orderItems.map(x => x.menu_item_id === i.menu_item_id ? {...x, quantity: parseInt(e.target.value) || 1} : x))} />
                          </td>
                          <td>{fp(i.unit_price)}</td>
                          <td>${(i.quantity * i.unit_price).toFixed(2)}</td>
                          <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeFromOrder(i.menu_item_id)}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-right mt-1" style={{ fontSize: 18 }}><strong>សរុប: {fp(orderTotal)}</strong></p>
                </>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Submit Order</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteMenu}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item?"
        confirmText="Delete"
        onConfirm={deleteMenu}
        onCancel={() => setConfirmDeleteMenu(null)}
        variant="danger"
      />
    </div>
  );
}
