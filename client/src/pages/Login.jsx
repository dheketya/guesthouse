import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('សូមស្វាគមន៍!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'ការចូលប្រើបរាជ័យ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>HappyStay</h1>
        <p>ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ឈ្មោះអ្នកប្រើ</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>ពាក្យសម្ងាត់</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'កំពុងចូល...' : 'ចូលប្រើ'}
          </button>
        </form>
      </div>
    </div>
  );
}
