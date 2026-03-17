import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { formatPrice } from '../utils/currency';

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editGuest, setEditGuest] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [stayHistory, setStayHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('stayed');
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: '', nationality: '', id_type: 'passport',
    id_number: '', id_expiry: '', phone: '', email: '', date_of_birth: '', notes: ''
  });

  const rate = settings.exchange_rate || 4100;
  const fp = (v) => formatPrice(v, rate);

  const load = () => {
    api.get('/guests', { params: search ? { search } : {} }).then(r => setGuests(r.data));
  };

  useEffect(() => { load(); }, [search]);
  useEffect(() => { api.get('/settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  const openAdd = () => {
    setEditGuest(null);
    setForm({ first_name: '', last_name: '', gender: '', nationality: '', id_type: 'passport', id_number: '', id_expiry: '', phone: '', email: '', date_of_birth: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditGuest(g);
    setForm({
      first_name: g.first_name, last_name: g.last_name, gender: g.gender || '', nationality: g.nationality || '',
      id_type: g.id_type || 'passport', id_number: g.id_number || '', id_expiry: g.id_expiry?.split('T')[0] || '',
      phone: g.phone || '', email: g.email || '', date_of_birth: g.date_of_birth?.split('T')[0] || '', notes: g.notes || ''
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editGuest) {
        await api.put(`/guests/${editGuest.id}`, form);
        toast.success('បានកែប្រែ');
      } else {
        await api.post('/guests', form);
        toast.success('បានបង្កើត');
      }
      setShowModal(false);
      load();
      // Refresh selected guest if viewing
      if (selectedGuest && editGuest && editGuest.id === selectedGuest.id) {
        viewGuest(editGuest.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  const viewGuest = async (id) => {
    try {
      const res = await api.get(`/guests/${id}`);
      setSelectedGuest(res.data);
      setStayHistory(res.data.stays || []);
      setHistoryFilter('stayed');
    } catch (err) {
      toast.error('កំហុស');
    }
  };

  // Filter stays
  const filteredStays = stayHistory.filter(s => {
    if (historyFilter === 'stayed') return ['checked_in', 'checked_out'].includes(s.status);
    if (historyFilter === 'cancelled') return s.status === 'cancelled';
    if (historyFilter === 'no_show') return s.status === 'no_show';
    if (historyFilter === 'pending') return ['pending', 'confirmed'].includes(s.status);
    return true; // 'all'
  });

  const statusLabels = {
    pending: 'រង់ចាំ', confirmed: 'បានបញ្ជាក់', checked_in: 'កំពុងស្នាក់នៅ',
    checked_out: 'បានចេញ', cancelled: 'បានលុបចោល', no_show: 'មិនមកទេ'
  };

  const totalStays = stayHistory.filter(s => ['checked_in', 'checked_out'].includes(s.status)).length;
  const totalNights = stayHistory
    .filter(s => ['checked_in', 'checked_out'].includes(s.status) && s.check_out_date)
    .reduce((sum, s) => sum + Math.max(1, Math.ceil((new Date(s.check_out_date + 'T00:00:00') - new Date(s.check_in_date + 'T00:00:00')) / (1000*60*60*24))), 0);

  // Guest detail view
  if (selectedGuest) {
    return (
      <div>
        <button className="btn btn-outline mb-2" onClick={() => setSelectedGuest(null)}>&larr; ត្រឡប់ទៅបញ្ជីភ្ញៀវ</button>

        <div className="card">
          <div className="card-header">
            <h3>{selectedGuest.first_name} {selectedGuest.last_name}</h3>
            <button className="btn btn-sm btn-outline" onClick={() => openEdit(selectedGuest)}>កែប្រែ</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px', fontSize: 14, marginBottom: 20 }}>
            <div><span style={{ color: '#888' }}>សញ្ជាតិ:</span> <strong>{selectedGuest.nationality || '-'}</strong></div>
            <div><span style={{ color: '#888' }}>ភេទ:</span> <strong>{selectedGuest.gender || '-'}</strong></div>
            <div><span style={{ color: '#888' }}>ថ្ងៃកំណើត:</span> <strong>{selectedGuest.date_of_birth || '-'}</strong></div>
            <div><span style={{ color: '#888' }}>ទូរសព្ទ:</span> <strong>{selectedGuest.phone || '-'}</strong></div>
            <div><span style={{ color: '#888' }}>អ៊ីមែល:</span> <strong>{selectedGuest.email || '-'}</strong></div>
            <div><span style={{ color: '#888' }}>លេខអត្តសញ្ញាណ:</span> <strong>{selectedGuest.id_number || '-'} ({selectedGuest.id_type || '-'})</strong></div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card blue">
              <div className="stat-label">ចំនួនស្នាក់នៅ</div>
              <div className="stat-value">{totalStays}</div>
              <div className="stat-sub">ដង</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">ចំនួនយប់សរុប</div>
              <div className="stat-value">{totalNights}</div>
              <div className="stat-sub">យប់</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-label">ប្រវត្តិទាំងអស់</div>
              <div className="stat-value">{stayHistory.length}</div>
              <div className="stat-sub">កំណត់ត្រា</div>
            </div>
          </div>
        </div>

        {/* Stay history */}
        <div className="card">
          <div className="card-header">
            <h3>ប្រវត្តិស្នាក់នៅ</h3>
            <div className="flex gap-2">
              {[
                { value: 'stayed', label: 'បានស្នាក់នៅ' },
                { value: 'pending', label: 'រង់ចាំ' },
                { value: 'cancelled', label: 'បានលុបចោល' },
                { value: 'no_show', label: 'មិនមក' },
                { value: 'all', label: 'ទាំងអស់' },
              ].map(f => (
                <button key={f.value} className={`btn btn-sm ${historyFilter === f.value ? 'btn-primary' : 'btn-outline'}`} onClick={() => setHistoryFilter(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Ref</th><th>បន្ទប់</th><th>ប្រភេទ</th><th>Cooling</th><th>តម្លៃ/យប់</th><th>ចូល</th><th>ចេញ</th><th>យប់</th><th>ស្ថានភាព</th></tr>
              </thead>
              <tbody>
                {filteredStays.map(s => {
                  const baseP = s.cooling_type === 'aircon' ? s.aircon_price : s.fan_price;
                  const price = s.price_type === 'discount' && s.custom_price ? s.custom_price : baseP;
                  const nights = s.check_out_date
                    ? Math.max(1, Math.ceil((new Date(s.check_out_date + 'T00:00:00') - new Date(s.check_in_date + 'T00:00:00')) / (1000*60*60*24)))
                    : '-';
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.booking_ref}</strong></td>
                      <td>{s.room_number} ({s.building_name})</td>
                      <td>{s.room_type_name}</td>
                      <td>{s.cooling_type === 'aircon' ? '❄ AC' : '🌀 Fan'}</td>
                      <td>
                        {fp(price)}
                        {s.price_type === 'discount' && <span style={{ color: '#e65100', fontSize: 11, marginLeft: 4 }}>បញ្ចុះ</span>}
                      </td>
                      <td>{s.check_in_date}</td>
                      <td>{s.check_out_date || '-'}</td>
                      <td><strong>{nights}</strong></td>
                      <td><span className={`badge badge-${s.status}`}>{statusLabels[s.status] || s.status}</span></td>
                    </tr>
                  );
                })}
                {filteredStays.length === 0 && (
                  <tr><td colSpan={9} className="text-center" style={{ padding: 40, color: '#999' }}>គ្មានកំណត់ត្រា</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Guest list view
  return (
    <div>
      <div className="toolbar">
        <input placeholder="ស្វែងរកតាមឈ្មោះ, លេខ ID, ឬទូរសព្ទ..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: 300 }} />
        <button className="btn btn-primary" onClick={openAdd}>+ បន្ថែមភ្ញៀវ</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>ទូរសព្ទ</th><th>ឈ្មោះ</th><th>សញ្ជាតិ</th><th>លេខ ID</th><th>ស្នាក់នៅ</th><th></th></tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => viewGuest(g.id)}>
                  <td><strong>{g.phone || '-'}</strong></td>
                  <td>{g.first_name || g.last_name ? `${g.first_name} ${g.last_name}`.trim() : '-'}</td>
                  <td>{g.nationality || '-'}</td>
                  <td>{g.id_number || '-'}</td>
                  <td style={{ color: '#4fc3f7', fontSize: 13 }}>មើលប្រវត្តិ →</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(g)}>កែប្រែ</button>
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr><td colSpan={6} className="text-center" style={{ padding: 40, color: '#999' }}>រកមិនឃើញភ្ញៀវ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editGuest ? 'កែប្រែភ្ញៀវ' : 'បន្ថែមភ្ញៀវ'}</h3>
            <form onSubmit={save}>
              <div className="form-group">
                <label>ទូរសព្ទ <span style={{ color: '#c62828' }}>*</span></label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required placeholder="ឧ. 012 345 678" style={{ fontSize: 16, padding: 12 }} />
              </div>
              <div className="form-row">
                <div className="form-group"><label>នាមត្រកូល</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                <div className="form-group"><label>នាមខ្លួន</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ភេទ</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option value="">ជ្រើសរើស</option><option value="male">ប្រុស</option><option value="female">ស្រី</option><option value="other">ផ្សេង</option>
                  </select>
                </div>
                <div className="form-group"><label>សញ្ជាតិ</label><input value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ប្រភេទ ID</label>
                  <select value={form.id_type} onChange={e => setForm({...form, id_type: e.target.value})}>
                    <option value="passport">លិខិតឆ្លងដែន</option><option value="national_id">អត្តសញ្ញាណប័ណ្ណ</option>
                    <option value="driving_license">ប័ណ្ណបើកបរ</option><option value="other">ផ្សេង</option>
                  </select>
                </div>
                <div className="form-group"><label>លេខ ID</label><input value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>ផុតកំណត់ ID</label><input type="date" value={form.id_expiry} onChange={e => setForm({...form, id_expiry: e.target.value})} /></div>
                <div className="form-group"><label>ថ្ងៃកំណើត</label><input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>អ៊ីមែល</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>កំណត់ចំណាំ</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editGuest ? 'រក្សាទុក' : 'បង្កើត'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
