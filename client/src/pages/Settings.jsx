import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(r => { setSettings(r.data); setLoading(false); });
  }, []);

  const update = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const save = async () => {
    try {
      await api.put('/settings', settings);
      toast.success('រក្សាទុកបានជោគជ័យ');
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុសក្នុងការរក្សាទុក');
    }
  };

  if (loading) return <p>កំពុងផ្ទុក...</p>;

  return (
    <div>
      <div className="card">
        <div className="card-header"><h3>ទូទៅ</h3></div>
        <div className="form-row">
          <div className="form-group">
            <label>ឈ្មោះផ្ទះសំណាក់</label>
            <input value={settings.guesthouse_name || ''} onChange={e => update('guesthouse_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>រូបិយប័ណ្ណ</label>
            <input value={settings.currency || ''} onChange={e => update('currency', e.target.value)} disabled />
            <small style={{ color: '#888' }}>USD & KHR (រៀល)</small>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>អត្រាប្តូរប្រាក់ (1 USD = ? KHR)</label>
            <input type="number" step="1" value={settings.exchange_rate || ''} onChange={e => update('exchange_rate', e.target.value)} placeholder="4100" />
            <small style={{ color: '#888' }}>ឧ. 4100 មានន័យថា $1 = 4,100៛</small>
          </div>
          <div className="form-group">
            <label>អត្រាពន្ធ (%)</label>
            <input type="number" step="0.01" value={settings.tax_rate || ''} onChange={e => update('tax_rate', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ថ្លៃចេញយឺត ($)</label>
            <input type="number" step="0.01" value={settings.late_checkout_fee || ''} onChange={e => update('late_checkout_fee', e.target.value)} />
          </div>
          <div className="form-group">
            <label>ថ្លៃបន្ថែមមនុស្ស ($)</label>
            <input type="number" step="0.01" value={settings.extra_person_charge || ''} onChange={e => update('extra_person_charge', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>ម៉ោងចូល / ចេញ</h3></div>
        <div className="form-row">
          <div className="form-group">
            <label>ម៉ោងចូលស្នាក់នៅ</label>
            <input type="time" value={settings.default_checkin_time || ''} onChange={e => update('default_checkin_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label>ម៉ោងចេញ</label>
            <input type="time" value={settings.default_checkout_time || ''} onChange={e => update('default_checkout_time', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>វិក្កយបត្រ</h3></div>
        <div className="form-group">
          <label>អត្ថបទខាងក្រោមវិក្កយបត្រ</label>
          <textarea value={settings.invoice_footer || ''} onChange={e => update('invoice_footer', e.target.value)} rows={3} />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} style={{ padding: '12px 32px', fontSize: 16 }}>រក្សាទុក</button>
    </div>
  );
}
