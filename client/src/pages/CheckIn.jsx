import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { formatPrice } from '../utils/currency';
import { printContent } from '../utils/print';

export default function CheckIn() {
  const [departures, setDepartures] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [allPending, setAllPending] = useState([]);
  const [tab, setTab] = useState('pending');
  const [showExtend, setShowExtend] = useState(null);
  const [newCheckout, setNewCheckout] = useState('');
  const [switchingCooling, setSwitchingCooling] = useState(null);
  const [showRoomChange, setShowRoomChange] = useState(null);
  const [newRoomId, setNewRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showLetter, setShowLetter] = useState(null);
  const [letterData, setLetterData] = useState(null);
  const [settings, setSettings] = useState({});
  const letterRef = useRef();

  // Confirmation states
  const [confirmCheckIn, setConfirmCheckIn] = useState(null);

  // Checkout flow states
  const [checkoutStep, setCheckoutStep] = useState(null); // null | 'date' | 'payment' | 'confirm'
  const [checkoutStay, setCheckoutStay] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [paymentCurrency, setPaymentCurrency] = useState('usd');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const load = () => {
    api.get('/checkin/today').then(r => setDepartures(r.data.departures));
    api.get('/reservations', { params: { status: 'checked_in' } }).then(r => setActiveStays(r.data));
    api.get('/reservations').then(r => {
      setAllPending(r.data.filter(res => ['confirmed', 'pending'].includes(res.status)));
    });
  };

  useEffect(() => {
    load();
    api.get('/settings').then(r => setSettings(r.data));
  }, []);

  const rate = settings.exchange_rate || 4100;
  const fp = (v) => formatPrice(v, rate);

  // Check-in
  const doCheckIn = async () => {
    try {
      const res = await api.post('/checkin', { reservation_id: confirmCheckIn.id });
      toast.success(`ចូលស្នាក់នៅបានជោគជ័យ! វិក្កយបត្រ: ${res.data.invoice_number}`);
      setConfirmCheckIn(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  // Checkout flow: Step 1 — open date picker
  const openCheckOut = (stay) => {
    setCheckoutStay(stay);
    const today = new Date().toISOString().split('T')[0];
    const ciDate = stay.check_in_date?.split('T')[0] || stay.check_in_date;
    const minDate = (() => { const d = new Date(ciDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
    setCheckoutDate(today >= minDate ? today : minDate);
    setCheckoutStep('date');
    setCheckoutInvoice(null);
  };

  // Checkout flow: Step 2 — load invoice and show payment
  const goToPayment = async () => {
    try {
      // Update checkout date first
      await api.put(`/reservations/${checkoutStay.id}`, {
        room_id: checkoutStay.room_id,
        check_in_date: checkoutStay.check_in_date?.split('T')[0] || checkoutStay.check_in_date,
        check_out_date: checkoutDate,
        num_guests: checkoutStay.num_guests,
        cooling_type: checkoutStay.cooling_type,
        price_type: checkoutStay.price_type,
        custom_price: checkoutStay.custom_price,
        booking_source: checkoutStay.booking_source,
        status: checkoutStay.status,
        special_requests: checkoutStay.special_requests,
        notes: checkoutStay.notes
      });

      // Load invoice
      const billingRes = await api.get('/billing', { params: { search: checkoutStay.booking_ref } });
      if (billingRes.data.length > 0) {
        const inv = await api.get(`/billing/${billingRes.data[0].id}`);
        setCheckoutInvoice(inv.data);
        const balance = inv.data.total - inv.data.paid_amount;
        setPaymentAmount(balance > 0 ? String(balance) : '0');
      } else {
        setCheckoutInvoice(null);
        setPaymentAmount('0');
      }
      setPaymentCurrency('usd');
      setPaymentMethod('cash');
      setPaymentRef('');
      setCheckoutStep('payment');
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  // Checkout flow: Step 3 — record payment then confirm checkout
  const doPayAndCheckOut = async () => {
    setCheckoutStep('confirm');
  };

  const doFinalCheckOut = async () => {
    try {
      // Record payment if amount > 0
      const amountUSD = paymentCurrency === 'khr'
        ? (parseFloat(paymentAmount) / rate)
        : parseFloat(paymentAmount);

      if (checkoutInvoice && amountUSD > 0) {
        await api.post(`/billing/${checkoutInvoice.id}/payments`, {
          amount: amountUSD.toFixed(2),
          payment_method: paymentMethod,
          reference: paymentRef || (paymentCurrency === 'khr' ? `បង់ជារៀល ${Number(paymentAmount).toLocaleString()}៛` : ''),
          notes: paymentCurrency === 'khr' ? `KHR ${Number(paymentAmount).toLocaleString()} @ ${rate}` : ''
        });
      }

      // Do checkout
      await api.post('/checkin/checkout', { reservation_id: checkoutStay.id });
      toast.success('ចេញបានជោគជ័យ!');
      setCheckoutStep(null);
      setCheckoutStay(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
      setCheckoutStep('payment');
    }
  };

  const cancelCheckout = () => {
    setCheckoutStep(null);
    setCheckoutStay(null);
    setCheckoutInvoice(null);
  };

  // Room change
  const openRoomChange = async (stay) => {
    setShowRoomChange(stay);
    setNewRoomId('');
    try {
      const res = await api.get('/rooms');
      // Show all available rooms except the current one
      setAvailableRooms(res.data.filter(r => r.id !== stay.room_id && r.status === 'available'));
    } catch { setAvailableRooms([]); }
  };

  const doRoomChange = async () => {
    if (!newRoomId) return;
    try {
      const res = await api.post('/checkin/room-change', { reservation_id: showRoomChange.id, new_room_id: newRoomId });
      toast.success(res.data.message);
      setShowRoomChange(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  // Other actions
  const switchCooling = async (reservationId, newCoolingType) => {
    try {
      const res = await api.post('/checkin/switch-cooling', { reservation_id: reservationId, new_cooling_type: newCoolingType });
      toast.success(res.data.message);
      setSwitchingCooling(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'កំហុស'); }
  };

  const extendStay = async (reservationId) => {
    try {
      const res = await api.post('/checkin/extend', { reservation_id: reservationId, new_checkout_date: newCheckout });
      toast.success(res.data.message);
      setShowExtend(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'កំហុស'); }
  };

  const openLetter = async (stay) => {
    try {
      const billingRes = await api.get('/billing', { params: { search: stay.booking_ref } });
      let invoice = null;
      if (billingRes.data.length > 0) {
        const invDetail = await api.get(`/billing/${billingRes.data[0].id}`);
        invoice = invDetail.data;
      }
      setLetterData({ stay, invoice });
      setShowLetter(true);
    } catch {
      setLetterData({ stay, invoice: null });
      setShowLetter(true);
    }
  };

  const printLetter = () => {
    const content = letterRef.current;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Checkout Letter</title><style>body{font-family:'Khmer OS Siemreap','Segoe UI',sans-serif;padding:40px;color:#1a1a2e}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #ddd}th{background:#f5f5f5;font-weight:600;font-size:11px;text-transform:uppercase}@media print{body{padding:20px}}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const today = new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' });
  const ghName = settings.guesthouse_name || 'HappyStay Guesthouse';

  return (
    <div>
      <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('pending')}>
          រង់ចាំចូល ({allPending.length})
        </button>
        <button className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('active')}>
          កំពុងស្នាក់នៅ ({activeStays.length})
        </button>
        <button className={`btn ${tab === 'departures' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('departures')}>
          ចេញថ្ងៃនេះ ({departures.length})
        </button>
      </div>

      {tab === 'pending' && (
        <div className="card">
          <div className="card-header"><h3>កក់បន្ទប់រង់ចាំចូល</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Ref</th><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>Cooling</th><th>តម្លៃ/យប់</th><th>ចូល</th><th>ចេញ</th><th>ស្ថានភាព</th><th></th></tr></thead>
              <tbody>
                {allPending.map(a => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const ciDate = a.check_in_date?.split('T')[0] || a.check_in_date;
                  const isFuture = ciDate > todayStr;
                  const actualPrice = a.price_type === 'discount' && a.custom_price ? a.custom_price : a.room_price;
                  return (
                    <tr key={a.id}>
                      <td><strong>{a.booking_ref}</strong></td>
                      <td><strong>{a.first_name} {a.last_name}</strong></td>
                      <td>{a.room_number} ({a.building_name})</td>
                      <td>{a.cooling_type === 'aircon' ? '❄ AC' : '🌀 Fan'}</td>
                      <td>
                        {fp(actualPrice)}
                        {a.price_type === 'discount' && <span style={{ color: '#e65100', fontSize: 11, marginLeft: 4 }}>បញ្ចុះ</span>}
                      </td>
                      <td>{ciDate}</td>
                      <td>{a.check_out_date || '-'}</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td>
                        {isFuture
                          ? <span style={{ color: '#999', fontSize: 12 }}>មិនទាន់ដល់ថ្ងៃ</span>
                          : <button className="btn btn-sm btn-success" onClick={() => setConfirmCheckIn(a)}>ចូលស្នាក់នៅ</button>}
                      </td>
                    </tr>
                  );
                })}
                {allPending.length === 0 && <tr><td colSpan={9} className="text-center" style={{ color: '#999', padding: 40 }}>គ្មានការកក់រង់ចាំ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'departures' && (
        <div className="card">
          <div className="card-header"><h3>រង់ចាំចេញថ្ងៃនេះ</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>អគារ</th><th>Cooling</th><th>ចូល</th><th></th></tr></thead>
              <tbody>
                {departures.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.first_name} {d.last_name}</strong></td>
                    <td>{d.room_number}</td>
                    <td>{d.building_name}</td>
                    <td>{d.cooling_type === 'aircon' ? '❄ AC' : '🌀 Fan'}</td>
                    <td>{d.check_in_date}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => openLetter(d)}>Letter</button>
                        <button className="btn btn-sm btn-danger" onClick={() => openCheckOut(d)}>ចេញ</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {departures.length === 0 && <tr><td colSpan={6} className="text-center" style={{ color: '#999', padding: 40 }}>គ្មានការចេញថ្ងៃនេះ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'active' && (
        <div className="card">
          <div className="card-header"><h3>កំពុងស្នាក់នៅ</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Ref</th><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>Cooling</th><th>តម្លៃ/យប់</th><th>ចូល</th><th>ចេញ</th><th></th></tr></thead>
              <tbody>
                {activeStays.map(s => {
                  const stayPrice = s.price_type === 'discount' && s.custom_price ? s.custom_price : s.room_price;
                  return (
                  <tr key={s.id}>
                    <td><strong>{s.booking_ref}</strong></td>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.room_number} ({s.building_name})</td>
                    <td><span className={`badge ${s.cooling_type === 'aircon' ? 'badge-occupied' : 'badge-available'}`}>{s.cooling_type === 'aircon' ? '❄ AC' : '🌀 Fan'}</span></td>
                    <td>{fp(stayPrice)} {s.price_type === 'discount' && <span style={{ color: '#e65100', fontSize: 11 }}>បញ្ចុះ</span>}</td>
                    <td>{s.check_in_date}</td>
                    <td>{s.check_out_date || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => openLetter(s)}>Letter</button>
                        <button className="btn btn-sm btn-danger" onClick={() => openCheckOut(s)}>ចេញ</button>
                        <button className="btn btn-sm btn-outline" onClick={() => { setShowExtend(s.id); setNewCheckout(''); }}>បន្ថែម</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openRoomChange(s)}>ផ្លាស់បន្ទប់</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSwitchingCooling(s)}>
                          {s.cooling_type === 'aircon' ? '→ Fan' : '→ AC'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );})}
                {activeStays.length === 0 && <tr><td colSpan={8} className="text-center" style={{ color: '#999', padding: 40 }}>គ្មានការស្នាក់នៅសកម្ម</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Check-in Confirmation */}
      <ConfirmModal
        open={!!confirmCheckIn}
        title="បញ្ជាក់ការចូលស្នាក់នៅ"
        confirmText="ចូលស្នាក់នៅ"
        onConfirm={doCheckIn}
        onCancel={() => setConfirmCheckIn(null)}
        variant="success"
      >
        {confirmCheckIn && (
          <div style={{ fontSize: 14 }}>
            <p><strong>{confirmCheckIn.first_name} {confirmCheckIn.last_name}</strong></p>
            <p style={{ color: '#666', marginTop: 4 }}>បន្ទប់ {confirmCheckIn.room_number} ({confirmCheckIn.building_name})</p>
            <p style={{ color: '#666', marginTop: 4 }}>{confirmCheckIn.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'} — {confirmCheckIn.price_type === 'custom' ? `$${Number(confirmCheckIn.custom_price).toFixed(2)}` : confirmCheckIn.price_type === 'discount' ? 'បញ្ចុះតម្លៃ' : 'ធម្មតា'}</p>
            <p style={{ color: '#666', marginTop: 4 }}>ថ្ងៃចូល: {confirmCheckIn.check_in_date} {confirmCheckIn.check_out_date ? `→ ${confirmCheckIn.check_out_date}` : ''}</p>
          </div>
        )}
      </ConfirmModal>

      {/* ===== CHECKOUT FLOW ===== */}

      {/* Step 1: Date Selection */}
      {checkoutStep === 'date' && checkoutStay && (() => {
        const ciDate = checkoutStay.check_in_date?.split('T')[0] || checkoutStay.check_in_date;
        const minCheckout = (() => { const d = new Date(ciDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
        const isValid = checkoutDate >= minCheckout;
        const nights = isValid ? Math.ceil((new Date(checkoutDate + 'T00:00:00') - new Date(ciDate + 'T00:00:00')) / (1000*60*60*24)) : 0;
        return (
          <div className="modal-overlay" onClick={cancelCheckout}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <h3>ជំហានទី ១ — ជ្រើសរើសថ្ងៃចេញ</h3>
              <div style={{ fontSize: 14, marginBottom: 16 }}>
                <p><strong>{checkoutStay.first_name} {checkoutStay.last_name}</strong> — បន្ទប់ {checkoutStay.room_number}</p>
                <p style={{ color: '#666', marginTop: 4 }}>ថ្ងៃចូល: {ciDate}</p>
              </div>
              <div className="form-group">
                <label>ថ្ងៃចេញ</label>
                <input type="date" value={checkoutDate} onChange={e => setCheckoutDate(e.target.value)} min={minCheckout} required />
              </div>
              {checkoutDate && !isValid && (
                <div style={{ background: '#ffebee', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#c62828' }}>
                  ថ្ងៃចេញត្រូវតែក្រោយថ្ងៃចូល ({ciDate})
                </div>
              )}
              {checkoutDate && isValid && (
                <div style={{ background: '#e8f5e9', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  ចំនួនយប់: <strong>{nights}</strong>
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={goToPayment} disabled={!isValid}>បន្ទាប់ — ទូទាត់ &rarr;</button>
                <button className="btn btn-secondary" onClick={cancelCheckout}>បោះបង់</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Step 2: Payment */}
      {checkoutStep === 'payment' && checkoutStay && (() => {
        const balance = checkoutInvoice ? (checkoutInvoice.total - checkoutInvoice.paid_amount) : 0;
        const balanceKHR = Math.round(balance * rate);
        const payAmountNum = parseFloat(paymentAmount) || 0;
        const payInUSD = paymentCurrency === 'khr' ? (payAmountNum / rate) : payAmountNum;

        return (
          <div className="modal-overlay" onClick={cancelCheckout}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h3>ជំហានទី ២ — ទូទាត់ប្រាក់</h3>

              {/* Invoice summary */}
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span>ភ្ញៀវ:</span>
                  <strong>{checkoutStay.first_name} {checkoutStay.last_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span>បន្ទប់:</span>
                  <strong>{checkoutStay.room_number} ({checkoutStay.building_name})</strong>
                </div>
                {checkoutInvoice && (
                  <>
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, marginTop: 8 }}>
                      {checkoutInvoice.items?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 4 }}>
                          <span>{item.description}</span>
                          <span>{fp(item.total_price)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span>សរុប:</span>
                        <strong>{fp(checkoutInvoice.total)}</strong>
                      </div>
                      {checkoutInvoice.paid_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#2e7d32' }}>
                          <span>បានបង់រួច:</span>
                          <span>{fp(checkoutInvoice.paid_amount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginTop: 4, color: balance > 0 ? '#c62828' : '#2e7d32' }}>
                        <span>{balance > 0 ? 'នៅជំពាក់:' : 'បានបង់គ្រប់'}</span>
                        {balance > 0 && <span>${balance.toFixed(2)} / {balanceKHR.toLocaleString()}៛</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Payment form */}
              {balance > 0 && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>បង់ជា</label>
                      <select value={paymentCurrency} onChange={e => {
                        setPaymentCurrency(e.target.value);
                        setPaymentAmount(e.target.value === 'khr' ? String(balanceKHR) : String(balance.toFixed(2)));
                      }}>
                        <option value="usd">🇺🇸 ដុល្លារ (USD)</option>
                        <option value="khr">🇰🇭 រៀល (KHR)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>វិធីទូទាត់</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="cash">សាច់ប្រាក់</option>
                        <option value="card">កាត</option>
                        <option value="bank_transfer">ផ្ទេរប្រាក់</option>
                        <option value="qr_code">QR Code</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>ចំនួនទឹកប្រាក់ {paymentCurrency === 'khr' ? '(៛)' : '($)'}</label>
                    <input
                      type="number"
                      step={paymentCurrency === 'khr' ? '100' : '0.01'}
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      style={{ fontSize: 18, fontWeight: 700, padding: 12 }}
                    />
                    {paymentCurrency === 'khr' && payAmountNum > 0 && (
                      <small style={{ color: '#666' }}>= ${(payAmountNum / rate).toFixed(2)} USD</small>
                    )}
                    {paymentCurrency === 'usd' && payAmountNum > 0 && (
                      <small style={{ color: '#666' }}>= {Math.round(payAmountNum * rate).toLocaleString()}៛</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>លេខយោង <span style={{ color: '#999', fontWeight: 400 }}>(ជម្រើស)</span></label>
                    <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="លេខវិក្កយបត្រ, លេខប្រតិបត្តិការ..." />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button className="btn btn-primary" onClick={doPayAndCheckOut}>
                  {balance > 0 ? 'បង់ប្រាក់ និង ចេញ →' : 'បញ្ជាក់ការចេញ →'}
                </button>
                <button className="btn btn-outline" onClick={() => setCheckoutStep('date')}>&larr; ថយក្រោយ</button>
                <button className="btn btn-secondary" onClick={cancelCheckout}>បោះបង់</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Step 3: Final Confirmation */}
      {checkoutStep === 'confirm' && checkoutStay && (() => {
        const balance = checkoutInvoice ? (checkoutInvoice.total - checkoutInvoice.paid_amount) : 0;
        const payAmountNum = parseFloat(paymentAmount) || 0;
        const displayPay = paymentCurrency === 'khr'
          ? `${Number(paymentAmount).toLocaleString()}៛ ($${(payAmountNum / rate).toFixed(2)})`
          : `$${payAmountNum.toFixed(2)} (${Math.round(payAmountNum * rate).toLocaleString()}៛)`;
        const methodLabels = { cash: 'សាច់ប្រាក់', card: 'កាត', bank_transfer: 'ផ្ទេរប្រាក់', qr_code: 'QR Code' };

        return (
          <div className="modal-overlay" onClick={cancelCheckout}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <h3>ជំហានទី ៣ — បញ្ជាក់ចុងក្រោយ</h3>
              <div style={{ background: '#fff3e0', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 14 }}>
                <p style={{ marginBottom: 8 }}><strong>{checkoutStay.first_name} {checkoutStay.last_name}</strong> — បន្ទប់ {checkoutStay.room_number}</p>
                <p>ថ្ងៃចូល: <strong>{checkoutStay.check_in_date}</strong></p>
                <p>ថ្ងៃចេញ: <strong>{checkoutDate}</strong></p>
                {balance > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid #ffe0b2', marginTop: 8, paddingTop: 8 }}>
                      <p>ការទូទាត់: <strong>{displayPay}</strong></p>
                      <p>វិធី: <strong>{methodLabels[paymentMethod]}</strong></p>
                    </div>
                  </>
                )}
              </div>
              <p style={{ color: '#c62828', fontWeight: 600, marginBottom: 16 }}>
                តើអ្នកពិតជាចង់បញ្ជាក់ការចេញនេះមែនទេ?
              </p>
              <div className="form-actions">
                <button className="btn btn-danger" onClick={doFinalCheckOut}>បញ្ជាក់ ចេញ</button>
                <button className="btn btn-outline" onClick={() => setCheckoutStep('payment')}>&larr; ថយក្រោយ</button>
                <button className="btn btn-secondary" onClick={cancelCheckout}>បោះបង់</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Extend Stay */}
      {showExtend && (
        <div className="modal-overlay" onClick={() => setShowExtend(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>បន្ថែមការស្នាក់នៅ</h3>
            <div className="form-group">
              <label>ថ្ងៃចេញថ្មី</label>
              <input type="date" value={newCheckout} onChange={e => setNewCheckout(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => extendStay(showExtend)} disabled={!newCheckout}>បញ្ជាក់</button>
              <button className="btn btn-secondary" onClick={() => setShowExtend(null)}>បោះបង់</button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Cooling */}
      {switchingCooling && (
        <div className="modal-overlay" onClick={() => setSwitchingCooling(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>{switchingCooling.cooling_type === 'fan' ? 'ដំឡើងទៅ Aircon' : 'បន្ថយទៅ Fan'}</h3>
            <p style={{ marginBottom: 12 }}>
              <strong>{switchingCooling.first_name} {switchingCooling.last_name}</strong> — បន្ទប់ {switchingCooling.room_number}
            </p>
            <p style={{ marginBottom: 16, color: '#555' }}>
              បច្ចុប្បន្ន: <strong>{switchingCooling.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'}</strong> → <strong>{switchingCooling.cooling_type === 'aircon' ? '🌀 Fan' : '❄ Aircon'}</strong>
            </p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>តម្លៃខុសគ្នានឹងត្រូវបានកែប្រែលើវិក្កយបត្រដោយស្វ័យប្រវត្តិ។</p>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => switchCooling(switchingCooling.id, switchingCooling.cooling_type === 'aircon' ? 'fan' : 'aircon')}>បញ្ជាក់</button>
              <button className="btn btn-secondary" onClick={() => setSwitchingCooling(null)}>បោះបង់</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Change */}
      {showRoomChange && (
        <div className="modal-overlay" onClick={() => setShowRoomChange(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>ផ្លាស់ប្តូរបន្ទប់</h3>
            <div style={{ fontSize: 14, marginBottom: 16 }}>
              <p><strong>{showRoomChange.first_name} {showRoomChange.last_name}</strong></p>
              <p style={{ color: '#666', marginTop: 4 }}>បន្ទប់បច្ចុប្បន្ន: <strong>{showRoomChange.room_number}</strong> ({showRoomChange.building_name}) — {showRoomChange.room_type_name}</p>
              <p style={{ color: '#666', marginTop: 4 }}>{showRoomChange.cooling_type === 'aircon' ? '❄ Aircon' : '🌀 Fan'} | {showRoomChange.price_type === 'custom' ? `$${showRoomChange.custom_price}` : showRoomChange.price_type === 'discount' ? 'បញ្ចុះតម្លៃ' : 'ធម្មតា'}</p>
            </div>
            <div className="form-group">
              <label>ជ្រើសរើសបន្ទប់ថ្មី</label>
              <select value={newRoomId} onChange={e => setNewRoomId(e.target.value)} style={{ fontSize: 14 }}>
                <option value="">— ជ្រើសរើសបន្ទប់ —</option>
                {availableRooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.room_number} — {r.room_type_name} (${Number(r.price || 0).toFixed(0)}) [{r.building_name}]
                  </option>
                ))}
              </select>
              {availableRooms.length === 0 && <small style={{ color: '#c62828' }}>គ្មានបន្ទប់ទំនេរ</small>}
            </div>
            {newRoomId && (() => {
              const newRoom = availableRooms.find(r => r.id === parseInt(newRoomId));
              if (!newRoom) return null;
              const isUpgrade = (newRoom.room_type_name !== showRoomChange.room_type_name);
              return (
                <div style={{ background: '#f0f7ff', padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  <p><strong>បន្ទប់ថ្មី:</strong> {newRoom.room_number} — {newRoom.room_type_name} ({newRoom.building_name})</p>
                  <p style={{ marginTop: 4 }}>តម្លៃ: ${Number(newRoom.price || 0).toFixed(2)}/យប់</p>
                  <p style={{ color: '#888', marginTop: 4, fontSize: 12 }}>តម្លៃខុសគ្នាសម្រាប់យប់នៅសល់នឹងត្រូវបានកែប្រែលើវិក្កយបត្រ។</p>
                </div>
              );
            })()}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={doRoomChange} disabled={!newRoomId}>បញ្ជាក់ផ្លាស់ប្តូរ</button>
              <button className="btn btn-secondary" onClick={() => setShowRoomChange(null)}>បោះបង់</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Letter */}
      {showLetter && letterData && (
        <div className="modal-overlay" onClick={() => setShowLetter(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="flex justify-between items-center mb-2">
              <h3>លិខិតចេញ</h3>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={printLetter}>បោះពុម្ព</button>
                <button className="btn btn-secondary" onClick={() => setShowLetter(false)}>បិទ</button>
              </div>
            </div>
            <div ref={letterRef} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 32, background: '#fff' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a2e', paddingBottom: 16, marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, marginBottom: 4 }}>{ghName}</h1>
                <p style={{ color: '#666', fontSize: 13 }}>សេចក្តីសង្ខេពការចេញ និង បង្កាន់ដៃ</p>
              </div>
              <p style={{ textAlign: 'right', fontSize: 13, color: '#666', marginBottom: 16 }}>ថ្ងៃទី: {today}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20, fontSize: 14 }}>
                <div><span style={{ color: '#666' }}>ភ្ញៀវ: </span><strong>{letterData.stay.first_name} {letterData.stay.last_name}</strong></div>
                <div><span style={{ color: '#666' }}>Ref: </span><strong>{letterData.stay.booking_ref}</strong></div>
                <div><span style={{ color: '#666' }}>បន្ទប់: </span><strong>{letterData.stay.room_number} ({letterData.stay.building_name})</strong></div>
                <div><span style={{ color: '#666' }}>Cooling: </span><strong>{letterData.stay.cooling_type === 'aircon' ? 'Aircon' : 'Fan'}</strong></div>
                <div><span style={{ color: '#666' }}>ចូល: </span><strong>{letterData.stay.check_in_date}</strong></div>
                <div><span style={{ color: '#666' }}>ចេញ: </span><strong>{letterData.stay.check_out_date || '-'}</strong></div>
              </div>
              {letterData.invoice && (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 13 }}>
                    <thead><tr style={{ background: '#f5f5f5' }}><th style={{ padding: '8px 12px', textAlign: 'left' }}>បរិយាយ</th><th style={{ padding: '8px 12px', textAlign: 'center' }}>ចំនួន</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>តម្លៃ</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>សរុប</th></tr></thead>
                    <tbody>
                      {letterData.invoice.items?.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 12px' }}>{item.description}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fp(item.unit_price)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fp(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', fontSize: 14 }}>
                    <p>សរុបរង: <strong>{fp(letterData.invoice.subtotal)}</strong></p>
                    {letterData.invoice.discount_amount > 0 && <p>បញ្ចុះតម្លៃ: <strong>-{fp(letterData.invoice.discount_amount)}</strong></p>}
                    <p style={{ fontSize: 18, fontWeight: 700, borderTop: '2px solid #1a1a2e', paddingTop: 8, marginTop: 8 }}>សរុប: {fp(letterData.invoice.total)}</p>
                    <p style={{ color: '#2e7d32' }}>បានបង់: {fp(letterData.invoice.paid_amount)}</p>
                    {(letterData.invoice.total - letterData.invoice.paid_amount) > 0.01 && (
                      <p style={{ color: '#c62828' }}>នៅជំពាក់: {fp(letterData.invoice.total - letterData.invoice.paid_amount)}</p>
                    )}
                  </div>
                </>
              )}
              <div style={{ marginTop: 50, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 200, textAlign: 'center' }}><div style={{ borderTop: '1px solid #333', marginTop: 50, paddingTop: 4, fontSize: 12, color: '#666' }}>ហត្ថលេខាភ្ញៀវ</div></div>
                <div style={{ width: 200, textAlign: 'center' }}><div style={{ borderTop: '1px solid #333', marginTop: 50, paddingTop: 4, fontSize: 12, color: '#666' }}>អ្នកទទួលភ្ញៀវ</div></div>
              </div>
              <div style={{ marginTop: 40, textAlign: 'center', color: '#666', fontSize: 13, borderTop: '1px solid #ddd', paddingTop: 16 }}>
                {settings.invoice_footer || 'អរគុណសម្រាប់ការស្នាក់នៅជាមួយយើង!'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
