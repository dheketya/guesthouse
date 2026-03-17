import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import GuestSearch from '../components/GuestSearch';
import { formatPrice, formatPriceShort } from '../utils/currency';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRes, setEditRes] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [form, setForm] = useState({
    guest_id: '', guest_name: '', guest_phone: '', room_id: '', check_in_date: '', check_out_date: '',
    num_guests: 1, cooling_type: 'aircon', price_type: 'regular', custom_price: '',
    booking_source: 'direct', status: 'confirmed', special_requests: '', notes: ''
  });
  const [phoneSearchResults, setPhoneSearchResults] = useState([]);
  const [phoneSearchDone, setPhoneSearchDone] = useState(false);

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/reservations', { params }).then(r => setReservations(r.data));
  };

  const [settings, setSettings] = useState({});
  const rate = settings.exchange_rate || 4100;

  useEffect(() => { load(); }, [search, statusFilter]);
  useEffect(() => {
    api.get('/rooms').then(r => setAllRooms(r.data));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const loadAvailableRooms = (checkIn, checkOut) => {
    const ci = checkIn || form.check_in_date;
    if (!ci) return;
    const params = { check_in: ci };
    if (checkOut || form.check_out_date) params.check_out = checkOut || form.check_out_date;
    api.get('/rooms/available', { params }).then(r => setRooms(r.data));
  };

  const openNew = () => {
    setEditRes(null);
    setForm({ guest_id: '', guest_name: '', guest_phone: '', room_id: '', check_in_date: '', check_out_date: '', num_guests: 1, cooling_type: 'aircon', price_type: 'regular', custom_price: '', booking_source: 'direct', status: 'confirmed', special_requests: '', notes: '' });
    setPhoneSearchResults([]);
    setPhoneSearchDone(false);
    setRooms([]);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRes(r);
    setForm({
      guest_id: r.guest_id,
      guest_name: `${r.first_name} ${r.last_name}`.trim(),
      guest_phone: r.guest_phone || '',
      room_id: String(r.room_id),
      check_in_date: r.check_in_date?.split('T')[0] || '',
      check_out_date: r.check_out_date?.split('T')[0] || '',
      num_guests: r.num_guests || 1,
      cooling_type: r.cooling_type || 'aircon',
      price_type: r.price_type || 'regular',
      custom_price: r.custom_price || '',
      booking_source: r.booking_source || 'direct',
      status: r.status,
      special_requests: r.special_requests || '',
      notes: r.notes || ''
    });
    // Load available rooms for the dates + include the currently assigned room
    if (r.check_in_date) {
      const ci = r.check_in_date.split('T')[0];
      const co = r.check_out_date?.split('T')[0];
      const params = { check_in: ci };
      if (co) params.check_out = co;
      api.get('/rooms/available', { params }).then(res => {
        // Add current room if not in available list
        const available = res.data;
        if (!available.find(rm => rm.id === r.room_id)) {
          const currentRoom = allRooms.find(rm => rm.id === r.room_id);
          if (currentRoom) available.unshift(currentRoom);
        }
        setRooms(available);
      });
    }
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    // Validate discount price
    if (form.price_type === 'discount' && form.custom_price) {
      const selectedRoom = rooms.find(r => r.id === parseInt(form.room_id));
      if (selectedRoom && parseFloat(form.custom_price) >= getRoomPrice(selectedRoom)) {
        toast.error('តម្លៃបញ្ចុះត្រូវតែតិចជាងតម្លៃពិត');
        return;
      }
    }
    try {
      if (editRes) {
        await api.put(`/reservations/${editRes.id}`, {
          room_id: form.room_id,
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date || null,
          num_guests: form.num_guests,
          cooling_type: form.cooling_type,
          price_type: form.price_type,
          custom_price: form.custom_price || null,
          booking_source: form.booking_source,
          status: form.status,
          special_requests: form.special_requests,
          notes: form.notes
        });
        toast.success('Reservation updated');
      } else {
        await api.post('/reservations', form);
        toast.success('Reservation created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const doCancel = async () => {
    try {
      await api.patch(`/reservations/${confirmCancel.id}/cancel`);
      toast.success('Reservation cancelled');
      setConfirmCancel(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  // Get room price based on cooling selection
  const getRoomPrice = (room) => {
    if (!room) return 0;
    return form.cooling_type === 'aircon' ? Number(room.aircon_price || 0) : Number(room.fan_price || 0);
  };

  const getPriceDisplay = () => {
    if (!form.room_id) return null;
    const selectedRoom = rooms.find(r => r.id === parseInt(form.room_id));
    if (!selectedRoom) return null;
    const basePrice = getRoomPrice(selectedRoom);
    const displayPrice = (form.price_type === 'discount' && form.custom_price) ? Number(form.custom_price) : basePrice;
    return (
      <div style={{ background: '#e8f5e9', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
        តម្លៃក្នុង១យប់: <strong>{formatPrice(displayPrice, rate)}</strong>
        <span style={{ color: '#666', marginLeft: 8 }}>
          ({form.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'}{form.price_type === 'discount' ? ', បញ្ចុះតម្លៃ' : ''})
        </span>
      </div>
    );
  };

  const navigate = useNavigate();

  return (
    <div>
      <button className="btn btn-outline mb-2" onClick={() => navigate('/frontdesk')}>&larr; ត្រឡប់ទៅកក់បន្ទប់</button>
      <div className="toolbar">
        <div className="flex gap-2 items-center">
          <input placeholder="ស្វែងរកតាមឈ្មោះ ឬ Ref..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: 280 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Reservation</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Ref</th><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>Cooling</th><th>តម្លៃ/យប់</th><th>ចូល</th><th>ចេញ</th><th>ស្ថានភាព</th><th></th></tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.booking_ref}</strong></td>
                  <td>{r.first_name} {r.last_name}</td>
                  <td>{r.room_number} ({r.building_name})</td>
                  <td>{r.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'}</td>
                  <td>
                    {(() => {
                      const basePrice = r.cooling_type === 'aircon' ? r.aircon_price : r.fan_price;
                      const price = r.price_type === 'discount' && r.custom_price ? r.custom_price : basePrice;
                      return (
                        <>
                          {formatPriceShort(price, rate)}
                          {r.price_type === 'discount' && <span style={{ color: '#e65100', fontSize: 11, marginLeft: 4 }}>បញ្ចុះ</span>}
                        </>
                      );
                    })()}
                  </td>
                  <td>{r.check_in_date?.split('T')[0]}</td>
                  <td>{r.check_out_date?.split('T')[0] || '-'}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {['pending', 'confirmed'].includes(r.status) && (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => setConfirmCancel(r)}>Cancel</button>
                        </>
                      )}
                      {r.status === 'checked_in' && (
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr><td colSpan={9} className="text-center" style={{ padding: 40, color: '#999' }}>No reservations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Confirmation */}
      <ConfirmModal
        open={!!confirmCancel}
        title="Cancel Reservation"
        message={confirmCancel ? `Cancel reservation ${confirmCancel.booking_ref} for ${confirmCancel.first_name} ${confirmCancel.last_name}?` : ''}
        confirmText="Yes, Cancel"
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(null)}
        variant="danger"
      />

      {/* Create / Edit Reservation Modal */}
      {showModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editRes ? `Edit Reservation — ${editRes.booking_ref}` : 'New Reservation'}</h3>
            <form onSubmit={save}>
              <div className="form-group">
                <label>ឈ្មោះភ្ញៀវ</label>
                <GuestSearch
                  value={form.guest_name}
                  onChange={(name) => setForm({...form, guest_name: name, guest_id: ''})}
                  onSelectGuest={(guest) => setForm({...form, guest_id: guest.id, guest_name: `${guest.first_name} ${guest.last_name}`})}
                  disabled={!!editRes}
                  placeholder="វាយឈ្មោះដើម្បីស្វែងរក ឬ បង្កើតថ្មី..."
                />
                {form.guest_id && !editRes && <small style={{ color: '#4caf50' }}>ភ្ញៀវដែលមានស្រាប់: ID #{form.guest_id}</small>}
                {!form.guest_id && form.guest_name && !editRes && <small style={{ color: '#888' }}>នឹងបង្កើតភ្ញៀវថ្មី</small>}
                {editRes && <small style={{ color: '#999' }}>មិនអាចផ្លាស់ប្តូរឈ្មោះនៅទីនេះ។</small>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date</label>
                  <input type="date" value={form.check_in_date} onChange={e => { setForm({...form, check_in_date: e.target.value}); loadAvailableRooms(e.target.value, form.check_out_date); }} required />
                </div>
                <div className="form-group">
                  <label>Check-out Date <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span></label>
                  <input type="date" value={form.check_out_date}
                    onChange={e => { setForm({...form, check_out_date: e.target.value}); loadAvailableRooms(form.check_in_date, e.target.value); }} />
                </div>
              </div>
              <div className="form-group">
                <label>Room {rooms.length > 0 && `(${rooms.length} available)`}</label>
                <select value={form.room_id} onChange={e => setForm({...form, room_id: e.target.value})} required>
                  <option value="">{form.check_in_date ? (rooms.length ? 'Select room' : 'No rooms available') : 'Set check-in date first'}</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} — {r.room_type_name} | Fan ${Number(r.fan_price||0).toFixed(0)} / AC ${Number(r.aircon_price||0).toFixed(0)} [{r.building_name}]</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cooling</label>
                  <select value={form.cooling_type} onChange={e => setForm({...form, cooling_type: e.target.value})}>
                    <option value="fan">🌀 Fan</option>
                    <option value="aircon">❄ Aircon</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>តម្លៃ</label>
                  <select value={form.price_type} onChange={e => setForm({...form, price_type: e.target.value, custom_price: ''})}>
                    <option value="regular">តម្លៃពិត</option>
                    <option value="discount">បញ្ចុះតម្លៃ</option>
                  </select>
                </div>
              </div>
              {form.price_type === 'discount' && (() => {
                const selectedRoom = rooms.find(r => r.id === parseInt(form.room_id));
                const roomPrice = selectedRoom ? getRoomPrice(selectedRoom) : 0;
                const discountVal = parseFloat(form.custom_price) || 0;
                const tooHigh = discountVal > 0 && roomPrice > 0 && discountVal >= roomPrice;
                return (
                  <div className="form-group">
                    <label>តម្លៃបញ្ចុះក្នុង១យប់ ($) {roomPrice > 0 && <span style={{ color: '#888', fontWeight: 400 }}>— តម្លៃពិត: ${roomPrice.toFixed(2)}</span>}</label>
                    <input type="number" step="0.01" value={form.custom_price} onChange={e => setForm({...form, custom_price: e.target.value})} required placeholder="ឧ. 15" max={roomPrice > 0 ? roomPrice - 0.01 : undefined} />
                    {tooHigh && (
                      <small style={{ color: '#c62828' }}>តម្លៃបញ្ចុះត្រូវតែតិចជាងតម្លៃពិត (${roomPrice.toFixed(2)})</small>
                    )}
                  </div>
                );
              })()}
              {getPriceDisplay()}
              <div className="form-row">
                <div className="form-group">
                  <label>Number of Guests</label>
                  <input type="number" min="1" value={form.num_guests} onChange={e => setForm({...form, num_guests: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Booking Source</label>
                  <select value={form.booking_source} onChange={e => setForm({...form, booking_source: e.target.value})}>
                    <option value="direct">Direct / Walk-in</option>
                    <option value="phone">Phone</option>
                    <option value="online">Online (OTA)</option>
                  </select>
                </div>
              </div>
              {editRes && (
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    {form.status === 'checked_in' && <option value="checked_in">Checked In</option>}
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Special Requests</label>
                <textarea value={form.special_requests} onChange={e => setForm({...form, special_requests: e.target.value})} rows={2} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editRes ? 'Update Reservation' : 'Create Reservation'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
