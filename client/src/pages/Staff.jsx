import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('staff');
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', role: 'receptionist', phone: '' });
  const [newPassword, setNewPassword] = useState('');

  const load = () => {
    api.get('/staff').then(r => setStaff(r.data));
  };

  useEffect(() => { load(); }, []);

  const loadLogs = () => {
    api.get('/staff/activity-log').then(r => setLogs(r.data));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff', form);
      toast.success('Staff created');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const toggleActive = async (s) => {
    await api.put(`/staff/${s.id}`, { full_name: s.full_name, role: s.role, phone: s.phone, is_active: !s.is_active });
    toast.success(s.is_active ? 'Staff disabled' : 'Staff enabled');
    load();
  };

  const resetPassword = async () => {
    if (!newPassword) return;
    try {
      await api.patch(`/staff/${showResetModal}/reset-password`, { new_password: newPassword });
      toast.success('Password reset');
      setShowResetModal(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button className={`btn ${tab === 'staff' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('staff')}>Staff Accounts</button>
        <button className={`btn ${tab === 'log' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab('log'); loadLogs(); }}>Activity Log</button>
      </div>

      {tab === 'staff' && (
        <>
          <div className="toolbar"><div /><button className="btn btn-primary" onClick={() => { setForm({ full_name: '', username: '', password: '', role: 'receptionist', phone: '' }); setShowModal(true); }}>+ Add Staff</button></div>
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.full_name}</strong></td>
                      <td>{s.username}</td>
                      <td><span className="role-badge">{s.role}</span></td>
                      <td>{s.phone || '-'}</td>
                      <td><span className={`badge ${s.is_active ? 'badge-available' : 'badge-maintenance'}`}>{s.is_active ? 'Active' : 'Disabled'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-outline" onClick={() => toggleActive(s)}>{s.is_active ? 'Disable' : 'Enable'}</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setShowResetModal(s.id); setNewPassword(''); }}>Reset PW</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.full_name || 'System'}</td>
                    <td>{l.action}</td>
                    <td>{l.details || '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={4} className="text-center" style={{ color: '#999', padding: 40 }}>No activity logged</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowModal(false))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>Add Staff Member</h3>
            <form onSubmit={save}>
              <div className="form-group"><label>Full Name</label><input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Username</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
                <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="receptionist">Receptionist</option><option value="restaurant">Restaurant Staff</option>
                    <option value="housekeeping">Housekeeping</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (() => setShowResetModal(null))(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>Reset Password</h3>
            <div className="form-group"><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={resetPassword}>Reset</button>
              <button className="btn btn-secondary" onClick={() => setShowResetModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
