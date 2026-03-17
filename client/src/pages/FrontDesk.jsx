import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { formatPrice } from '../utils/currency';

const DAYS_TO_SHOW = 14;

function getDateRange(startDate, days) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dd}`);
  }
  return dates;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return { day: dayNames[d.getDay()], date: d.getDate() };
}

function isToday(dateStr) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${dd}`;
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function FrontDesk() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [settings, setSettings] = useState({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
  const [selectedRes, setSelectedRes] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ guest_id: '', guest_name: '', guest_phone: '', room_id: '', check_in_date: '', check_out_date: '', cooling_type: 'aircon', price_type: 'regular', custom_price: '', num_guests: 1 });
  const [phoneSearchResults, setPhoneSearchResults] = useState([]);
  const [phoneSearchDone, setPhoneSearchDone] = useState(false);
  const [filterType, setFilterType] = useState('');

  const dates = useMemo(() => getDateRange(startDate, DAYS_TO_SHOW), [startDate]);

  const load = () => {
    api.get('/rooms').then(r => setRooms(r.data));
    api.get('/reservations').then(r => setReservations(r.data));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // Group rooms by type
  const roomTypes = useMemo(() => {
    const types = {};
    rooms.forEach(r => {
      if (!types[r.room_type_name]) types[r.room_type_name] = [];
      types[r.room_type_name].push(r);
    });
    return types;
  }, [rooms]);

  const filteredTypes = filterType ? { [filterType]: roomTypes[filterType] || [] } : roomTypes;

  // Get active reservations (not cancelled/no_show)
  const activeReservations = useMemo(() => {
    return reservations.filter(r => !['cancelled', 'no_show', 'checked_out'].includes(r.status));
  }, [reservations]);

  // Check if a room is booked on a date
  const isBooked = (roomId, dateStr) => {
    return activeReservations.some(r => {
      if (r.room_id !== roomId) return false;
      const ci = r.check_in_date;
      const co = r.check_out_date;
      if (!co) return ci <= dateStr; // No checkout = ongoing
      return ci <= dateStr && co > dateStr;
    });
  };

  // Get available count per type per date
  const getAvailableCount = (typeName, dateStr) => {
    const typeRooms = roomTypes[typeName] || [];
    return typeRooms.filter(room => !isBooked(room.id, dateStr) && room.status !== 'maintenance').length;
  };

  // Build cells for a room row: produces array of { type: 'empty'|'booking', span, date, res? }
  const buildRoomCells = (roomId) => {
    const cells = [];
    let i = 0;
    while (i < dates.length) {
      const dateStr = dates[i];

      // Find reservation that covers this date
      const res = activeReservations.find(r => {
        if (r.room_id !== roomId) return false;
        const ci = r.check_in_date;
        const co = r.check_out_date;
        if (!co) return ci <= dateStr;
        return ci <= dateStr && co > dateStr;
      });

      if (res) {
        // Calculate how many visible columns this reservation spans from current position
        const co = res.check_out_date;
        let span = 1;
        if (co) {
          // Span until checkout date or end of visible range
          for (let j = i + 1; j < dates.length; j++) {
            if (dates[j] < co) {
              span++;
            } else {
              break;
            }
          }
        } else {
          // No checkout date — span to end of visible range
          span = dates.length - i;
        }

        cells.push({ type: 'booking', span, date: dateStr, res });
        i += span;
      } else {
        cells.push({ type: 'empty', span: 1, date: dateStr });
        i++;
      }
    }
    return cells;
  };

  // Navigate
  const prevWeek = () => {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setStartDate(`${y}-${m}-${dd}`);
  };

  const nextWeek = () => {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setStartDate(`${y}-${m}-${dd}`);
  };

  const goToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setStartDate(`${y}-${m}-${dd}`);
  };

  // Quick book
  const openQuickBook = (room, dateStr) => {
    setBookingForm({ guest_id: '', guest_name: '', guest_phone: '', room_id: String(room.id), check_in_date: dateStr, check_out_date: '', cooling_type: 'aircon', price_type: 'regular', custom_price: '', num_guests: 1 });
    setPhoneSearchResults([]); setPhoneSearchDone(false);
    setShowBookingModal(true);
  };

  const saveBooking = async (e) => {
    e.preventDefault();
    if (bookingForm.price_type === 'discount' && bookingForm.custom_price) {
      const selectedRoom = rooms.find(r => r.id === parseInt(bookingForm.room_id));
      const bPrice = selectedRoom ? (bookingForm.cooling_type === 'aircon' ? Number(selectedRoom.aircon_price) : Number(selectedRoom.fan_price)) : 0;
      if (selectedRoom && parseFloat(bookingForm.custom_price) >= bPrice) {
        toast.error('តម្លៃបញ្ចុះត្រូវតែតិចជាងតម្លៃពិត');
        return;
      }
    }
    try {
      await api.post('/reservations', bookingForm);
      toast.success('កក់បន្ទប់បានជោគជ័យ');
      setShowBookingModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  // Actions
  const doCheckIn = async () => {
    try {
      const res = await api.post('/checkin', { reservation_id: selectedRes.id });
      toast.success(`ចូលស្នាក់នៅបានជោគជ័យ!`);
      setSelectedRes(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'កំហុស'); }
  };

  const doCheckOut = async () => {
    try {
      await api.post('/checkin/checkout', { reservation_id: selectedRes.id });
      toast.success('ចេញបានជោគជ័យ');
      setSelectedRes(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'កំហុស'); }
  };

  const doCancel = async () => {
    try {
      await api.patch(`/reservations/${selectedRes.id}/cancel`);
      toast.success('បានលុបចោល');
      setSelectedRes(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'កំហុស'); }
  };

  const statusColors = { pending: '#fff3e0', confirmed: '#e8f5e9', checked_in: '#e3f2fd' };
  const statusBorders = { pending: '#ff9800', confirmed: '#4caf50', checked_in: '#2196f3' };
  const statusLabels = { pending: 'រង់ចាំ', confirmed: 'បានបញ្ជាក់', checked_in: 'កំពុងស្នាក់នៅ' };

  const endDateStr = dates[dates.length - 1] || startDate;

  // Format date range header
  const rangeText = (() => {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDateStr + 'T00:00:00');
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${sMonth} ${s.getDate()} — ${eMonth} ${e.getDate()}`;
  })();

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="flex gap-2 items-center">
          <button className="btn btn-outline" onClick={prevWeek}>&larr;</button>
          <button className="btn btn-outline" onClick={goToday}>ថ្ងៃនេះ</button>
          <button className="btn btn-outline" onClick={nextWeek}>&rarr;</button>
          <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 12 }}>{rangeText}</span>
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">ប្រភេទទាំងអស់</option>
            {Object.keys(roomTypes).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn btn-outline" onClick={() => navigate('/reservations')}>បញ្ជីការកក់</button>
          <button className="btn btn-primary" onClick={() => { setBookingForm({ guest_id: '', guest_name: '', guest_phone: '', room_id: '', check_in_date: startDate, check_out_date: '', cooling_type: 'aircon', price_type: 'regular', custom_price: '', num_guests: 1 }); setPhoneSearchResults([]); setPhoneSearchDone(false); setShowBookingModal(true); }}>
            + កក់បន្ទប់ថ្មី
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="front-desk-table">
            <thead>
              <tr>
                <th className="fd-room-col">បន្ទប់</th>
                {dates.map(d => {
                  const { day, date } = formatDay(d);
                  const today = isToday(d);
                  const weekend = isWeekend(d);
                  return (
                    <th key={d} className={`fd-date-col ${today ? 'fd-today' : ''} ${weekend ? 'fd-weekend' : ''}`}>
                      <div className="fd-day-name">{day}</div>
                      <div className="fd-day-num">{date}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(filteredTypes).map(([typeName, typeRooms]) => (
                <React.Fragment key={`type-${typeName}`}>
                  {/* Type header */}
                  <tr className="fd-type-row">
                    <td className="fd-type-name">
                      <strong>{typeName}</strong>
                      <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>({typeRooms.length})</span>
                    </td>
                    {dates.map(d => {
                      const avail = getAvailableCount(typeName, d);
                      const total = typeRooms.length;
                      const color = avail === 0 ? '#ef5350' : avail <= Math.ceil(total / 3) ? '#ff9800' : '#4caf50';
                      return (
                        <td key={d} className="fd-avail-cell">
                          <span className="fd-avail-badge" style={{ background: color }}>{avail}</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Room rows */}
                  {typeRooms.map(room => {
                    const cells = buildRoomCells(room.id);
                    return (
                      <tr key={room.id} className="fd-room-row">
                        <td className="fd-room-name">
                          <span className={`fd-room-dot ${room.status}`}></span>
                          <strong>{room.room_number}</strong>
                          <span style={{ color: '#aaa', fontSize: 11, marginLeft: 4 }}>{room.building_code}</span>
                        </td>
                        {cells.map((cell, ci) => {
                          if (cell.type === 'booking') {
                            const res = cell.res;
                            return (
                              <td key={ci} colSpan={cell.span} className="fd-cell">
                                <div
                                  className="fd-booking-bar"
                                  style={{
                                    background: statusColors[res.status] || '#f5f5f5',
                                    borderLeft: `4px solid ${statusBorders[res.status] || '#999'}`,
                                  }}
                                  onClick={() => setSelectedRes(res)}
                                  title={`${res.first_name} ${res.last_name} | ${res.check_in_date} → ${res.check_out_date || '?'}`}
                                >
                                  <span className="fd-guest-name">{res.first_name} {res.last_name}</span>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={ci} className="fd-cell fd-empty" onClick={() => openQuickBook(room, cell.date)}>
                              <div className="fd-add-hint">+</div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-2 items-center" style={{ marginTop: 12, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
        <span>ស្ថានភាព:</span>
        {Object.entries(statusLabels).map(([k, label]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, background: statusColors[k], borderLeft: `3px solid ${statusBorders[k]}`, display: 'inline-block', borderRadius: 2 }}></span>
            {label}
          </span>
        ))}
      </div>

      {/* Reservation detail */}
      {selectedRes && (() => {
        const rRate = settings.exchange_rate || 4100;
        const basePrice = selectedRes.cooling_type === 'aircon' ? selectedRes.aircon_price : selectedRes.fan_price;
        const actualPrice = selectedRes.price_type === 'discount' && selectedRes.custom_price ? selectedRes.custom_price : basePrice;
        const nights = selectedRes.check_out_date
          ? Math.max(1, Math.ceil((new Date(selectedRes.check_out_date + 'T00:00:00') - new Date(selectedRes.check_in_date + 'T00:00:00')) / (1000*60*60*24)))
          : null;
        const totalEst = nights ? (Number(actualPrice) * nights) : null;

        return (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setSelectedRes(null))(); }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <h3>ព័ត៌មានការកក់ — {selectedRes.booking_ref}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 14, margin: '16px 0' }}>
                <div><span style={{ color: '#888' }}>ភ្ញៀវ:</span> <strong>{selectedRes.first_name} {selectedRes.last_name}</strong></div>
                <div><span style={{ color: '#888' }}>បន្ទប់:</span> <strong>{selectedRes.room_number}</strong></div>
                <div><span style={{ color: '#888' }}>អគារ:</span> <strong>{selectedRes.building_name}</strong></div>
                <div><span style={{ color: '#888' }}>ប្រភេទ:</span> <strong>{selectedRes.room_type_name}</strong></div>
                <div><span style={{ color: '#888' }}>ចូល:</span> <strong>{selectedRes.check_in_date}</strong></div>
                <div><span style={{ color: '#888' }}>ចេញ:</span> <strong>{selectedRes.check_out_date || '-'}</strong></div>
                <div><span style={{ color: '#888' }}>Cooling:</span> <strong>{selectedRes.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'}</strong></div>
                <div><span style={{ color: '#888' }}>ចំនួនភ្ញៀវ:</span> <strong>{selectedRes.num_guests} នាក់</strong></div>
                <div><span style={{ color: '#888' }}>ស្ថានភាព:</span> <span className={`badge badge-${selectedRes.status}`}>{statusLabels[selectedRes.status] || selectedRes.status}</span></div>
              </div>

              {/* Price summary */}
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span>🌀 Fan / ❄ AC:</span>
                  <strong>{formatPrice(selectedRes.fan_price, rRate)} / {formatPrice(selectedRes.aircon_price, rRate)}</strong>
                </div>
                {selectedRes.price_type === 'discount' && selectedRes.custom_price && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4, color: '#e65100' }}>
                    <span>តម្លៃបញ្ចុះ:</span>
                    <strong>{formatPrice(selectedRes.custom_price, rRate)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid #ddd', paddingTop: 8, marginTop: 4 }}>
                  <span>តម្លៃក្នុង១យប់:</span>
                  <span>{formatPrice(actualPrice, rRate)}</span>
                </div>
                {nights && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#1565c0' }}>
                    <span>សរុបប៉ាន់ស្មាន ({nights} យប់):</span>
                    <span>{formatPrice(totalEst, rRate)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {['pending', 'confirmed'].includes(selectedRes.status) && (
                  <>
                    <button className="btn btn-success" onClick={doCheckIn}>ចូលស្នាក់នៅ</button>
                    <button className="btn btn-danger" onClick={doCancel}>លុបចោល</button>
                  </>
                )}
                {selectedRes.status === 'checked_in' && (
                  <button className="btn btn-danger" onClick={doCheckOut}>ចេញ</button>
                )}
                <button className="btn btn-secondary" onClick={() => setSelectedRes(null)}>បិទ</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick booking modal */}
      {showBookingModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowBookingModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>កក់បន្ទប់ថ្មី</h3>
            <form onSubmit={saveBooking}>
              {/* Phone-first guest lookup */}
              <div className="form-group">
                <label>លេខទូរសព្ទ <span style={{ color: '#c62828' }}>*</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={bookingForm.guest_phone}
                    onChange={e => { setBookingForm({...bookingForm, guest_phone: e.target.value, guest_id: ''}); setPhoneSearchDone(false); setPhoneSearchResults([]); }}
                    placeholder="ឧ. 012 345 678"
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-outline" onClick={async () => {
                    if (!bookingForm.guest_phone.trim()) return;
                    try {
                      const res = await api.get('/guests', { params: { search: bookingForm.guest_phone.trim() } });
                      const matches = res.data.filter(g => g.phone && g.phone.replace(/\s/g, '').includes(bookingForm.guest_phone.trim().replace(/\s/g, '')));
                      setPhoneSearchResults(matches);
                      setPhoneSearchDone(true);
                      if (matches.length === 1) {
                        const g = matches[0];
                        setBookingForm(f => ({...f, guest_id: g.id, guest_name: `${g.first_name} ${g.last_name}`.trim()}));
                      }
                    } catch { setPhoneSearchResults([]); setPhoneSearchDone(true); }
                  }}>ស្វែងរក</button>
                </div>
              </div>

              {/* Phone search results */}
              {phoneSearchDone && phoneSearchResults.length > 1 && (
                <div className="form-group">
                  <label>រកឃើញភ្ញៀវ ({phoneSearchResults.length})</label>
                  <div style={{ border: '1px solid #ddd', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
                    {phoneSearchResults.map(g => (
                      <div key={g.id} onClick={() => { setBookingForm(f => ({...f, guest_id: g.id, guest_name: `${g.first_name} ${g.last_name}`.trim()})); setPhoneSearchResults([g]); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: bookingForm.guest_id === g.id ? '#e8f5e9' : '#fff' }}>
                        <strong>{g.first_name} {g.last_name}</strong> <span style={{ color: '#888', fontSize: 12 }}>({g.phone})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected guest or new guest name */}
              {phoneSearchDone && bookingForm.guest_id && (
                <div style={{ background: '#e8f5e9', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
                  ✓ ភ្ញៀវដែលមានស្រាប់: <strong>{bookingForm.guest_name}</strong>
                </div>
              )}

              {phoneSearchDone && !bookingForm.guest_id && (
                <div className="form-group">
                  <label>ឈ្មោះភ្ញៀវ (ថ្មី)</label>
                  <input value={bookingForm.guest_name} onChange={e => setBookingForm({...bookingForm, guest_name: e.target.value})} placeholder="នាមត្រកូល នាមខ្លួន" />
                  <small style={{ color: '#888' }}>នឹងបង្កើតភ្ញៀវថ្មីជាមួយលេខទូរសព្ទនេះ</small>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>ថ្ងៃចូល</label>
                  <input type="date" value={bookingForm.check_in_date} onChange={e => setBookingForm({...bookingForm, check_in_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>ថ្ងៃចេញ <span style={{ color: '#999', fontWeight: 400 }}>(ជម្រើស)</span></label>
                  <input type="date" value={bookingForm.check_out_date} onChange={e => setBookingForm({...bookingForm, check_out_date: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>បន្ទប់</label>
                <select value={bookingForm.room_id} onChange={e => setBookingForm({...bookingForm, room_id: e.target.value})} required>
                  <option value="">ជ្រើសរើសបន្ទប់</option>
                  {rooms.filter(r => r.status !== 'maintenance').map(r => (
                    <option key={r.id} value={r.id}>{r.room_number} — {r.room_type_name} | Fan ${Number(r.fan_price||0).toFixed(0)} / AC ${Number(r.aircon_price||0).toFixed(0)} [{r.building_code}]</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cooling</label>
                  <select value={bookingForm.cooling_type} onChange={e => setBookingForm({...bookingForm, cooling_type: e.target.value})}>
                    <option value="fan">🌀 Fan</option>
                    <option value="aircon">❄ Aircon</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>តម្លៃ</label>
                  <select value={bookingForm.price_type} onChange={e => setBookingForm({...bookingForm, price_type: e.target.value, custom_price: ''})}>
                    <option value="regular">តម្លៃពិត</option>
                    <option value="discount">បញ្ចុះតម្លៃ</option>
                  </select>
                </div>
              </div>
              {bookingForm.price_type === 'discount' && (() => {
                const selectedRoom = rooms.find(r => r.id === parseInt(bookingForm.room_id));
                const roomPrice = selectedRoom ? (bookingForm.cooling_type === 'aircon' ? Number(selectedRoom.aircon_price) : Number(selectedRoom.fan_price)) : 0;
                const discountVal = parseFloat(bookingForm.custom_price) || 0;
                const tooHigh = discountVal > 0 && roomPrice > 0 && discountVal >= roomPrice;
                return (
                  <div className="form-group">
                    <label>តម្លៃបញ្ចុះក្នុង១យប់ ($) {roomPrice > 0 && <span style={{ color: '#888', fontWeight: 400 }}>— តម្លៃពិត: ${roomPrice.toFixed(2)}</span>}</label>
                    <input type="number" step="0.01" value={bookingForm.custom_price} onChange={e => setBookingForm({...bookingForm, custom_price: e.target.value})} required placeholder="ឧ. 15" />
                    {tooHigh && <small style={{ color: '#c62828' }}>តម្លៃបញ្ចុះត្រូវតែតិចជាងតម្លៃពិត (${roomPrice.toFixed(2)})</small>}
                  </div>
                );
              })()}
              <div className="form-group">
                <label>ចំនួនភ្ញៀវ</label>
                <input type="number" min="1" value={bookingForm.num_guests} onChange={e => setBookingForm({...bookingForm, num_guests: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">កក់បន្ទប់</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>បោះបង់</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
