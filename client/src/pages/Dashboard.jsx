import { useState, useEffect } from 'react';
import api from '../api';
import { formatPrice } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const months = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [arrivals, setArrivals] = useState({ arrivals: [], departures: [] });
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setData(r.data)).catch(() => {});
    api.get('/reports/revenue/monthly').then(r => {
      const chart = r.data.map(d => ({ name: months[d.month - 1], revenue: d.total }));
      setRevenue(chart);
    }).catch(() => {});
    api.get('/checkin/today').then(r => setArrivals(r.data)).catch(() => {});
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const rate = settings.exchange_rate || 4100;

  if (!data) return <p>កំពុងផ្ទុក...</p>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">អត្រាកាន់កាប់បន្ទប់</div>
          <div className="stat-value">{data.occupancy_rate}%</div>
          <div className="stat-sub">{data.occupied_rooms} / {data.total_rooms} បន្ទប់</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">ចូលស្នាក់នៅថ្ងៃនេះ</div>
          <div className="stat-value">{data.today_arrivals}</div>
          <div className="stat-sub">រង់ចាំចូល</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">ចេញថ្ងៃនេះ</div>
          <div className="stat-value">{data.today_departures}</div>
          <div className="stat-sub">រង់ចាំចេញ</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">នៅជំពាក់</div>
          <div className="stat-value">{formatPrice(data.outstanding_amount, rate)}</div>
          <div className="stat-sub">{data.outstanding_count} វិក្កយបត្រមិនទាន់បង់</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>ចំណូលប្រចាំខែ</h3></div>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#4fc3f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>មិនទាន់មានទិន្នន័យចំណូល</p>}
        </div>

        <div className="card">
          <div className="card-header"><h3>បន្ទប់ទំនេរតាមប្រភេទ</h3></div>
          <table>
            <thead><tr><th>ប្រភេទ</th><th>ទំនេរ</th></tr></thead>
            <tbody>
              {data.available_by_type.map(t => (
                <tr key={t.name}><td>{t.name}</td><td>{t.count}</td></tr>
              ))}
              {data.available_by_type.length === 0 && (
                <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999' }}>មិនទាន់មានបន្ទប់</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="card">
          <div className="card-header"><h3>ចូលស្នាក់នៅថ្ងៃនេះ</h3></div>
          <table>
            <thead><tr><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>អគារ</th></tr></thead>
            <tbody>
              {arrivals.arrivals.map(a => (
                <tr key={a.id}><td>{a.first_name} {a.last_name}</td><td>{a.room_number}</td><td>{a.building_name}</td></tr>
              ))}
              {arrivals.arrivals.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>គ្មានការចូលថ្ងៃនេះ</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-header"><h3>ចេញថ្ងៃនេះ</h3></div>
          <table>
            <thead><tr><th>ភ្ញៀវ</th><th>បន្ទប់</th><th>អគារ</th></tr></thead>
            <tbody>
              {arrivals.departures.map(d => (
                <tr key={d.id}><td>{d.first_name} {d.last_name}</td><td>{d.room_number}</td><td>{d.building_name}</td></tr>
              ))}
              {arrivals.departures.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>គ្មានការចេញថ្ងៃនេះ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
