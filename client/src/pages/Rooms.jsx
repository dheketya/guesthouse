import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatPriceShort } from '../utils/currency';

export default function Rooms() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [floors, setFloors] = useState({});
  const [settings, setSettings] = useState({});
  const [view, setView] = useState('grid');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [editBuilding, setEditBuilding] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ room_number: '', building_id: '', floor_id: '', room_type_id: '', price: '', notes: '' });
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', description: '', floors: ['1'], existingFloors: [] });
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editType, setEditType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: '', base_price: '', max_guests: 2, description: '' });

  const load = () => {
    api.get('/rooms').then(r => setRooms(r.data));
    api.get('/buildings').then(r => {
      setBuildings(r.data);
      // Load floors for each building
      r.data.forEach(b => loadFloors(b.id));
    });
    api.get('/rooms/types').then(r => setRoomTypes(r.data));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  };

  const rate = settings.exchange_rate || 4100;

  const loadFloors = async (buildingId) => {
    try {
      const res = await api.get(`/buildings/${buildingId}`);
      setFloors(prev => ({ ...prev, [buildingId]: res.data.floors || [] }));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const filtered = rooms.filter(r => {
    if (filterBuilding && r.building_id !== parseInt(filterBuilding)) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  // Get floors for selected building in room form
  const selectedBuildingFloors = form.building_id ? (floors[form.building_id] || []) : [];

  const openAdd = () => {
    setEditRoom(null);
    setForm({ room_number: '', building_id: '', floor_id: '', room_type_id: roomTypes[0]?.id || '', price: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setForm({
      room_number: room.room_number, building_id: room.building_id, floor_id: room.floor_id || '',
      room_type_id: room.room_type_id, price: room.price || '', notes: room.notes || ''
    });
    // Make sure floors for this building are loaded
    if (room.building_id && !floors[room.building_id]) {
      loadFloors(room.building_id);
    }
    setShowModal(true);
  };

  const handleBuildingChange = (buildingId) => {
    setForm({ ...form, building_id: buildingId, floor_id: '' });
    if (buildingId && !floors[buildingId]) {
      loadFloors(buildingId);
    }
  };

  const saveRoom = async (e) => {
    e.preventDefault();
    try {
      if (editRoom) {
        await api.put(`/rooms/${editRoom.id}`, { ...form, status: editRoom.status });
      } else {
        await api.post('/rooms', form);
      }
      toast.success(editRoom ? 'Room updated' : 'Room created');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving room');
    }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/rooms/${id}/status`, { status });
    toast.success('Status updated');
    load();
  };

  const deleteRoom = async (id) => {
    setConfirmDelete({ type: 'room', id, message: 'Are you sure you want to delete this room?' });
  };

  // Building form: add/remove floor inputs
  const getNextFloorName = () => {
    const totalFloors = (buildingForm.existingFloors?.length || 0) + buildingForm.floors.length;
    return totalFloors === 0 ? 'Ground Floor' : String(totalFloors);
  };

  const addFloorInput = () => {
    setBuildingForm({ ...buildingForm, floors: [...buildingForm.floors, getNextFloorName()] });
  };

  const removeFloorInput = (index) => {
    setBuildingForm({ ...buildingForm, floors: buildingForm.floors.filter((_, i) => i !== index) });
  };

  const updateFloorInput = (index, value) => {
    const updated = [...buildingForm.floors];
    updated[index] = value;
    setBuildingForm({ ...buildingForm, floors: updated });
  };

  const openAddBuilding = () => {
    setEditBuilding(null);
    setBuildingForm({ name: '', code: '', description: '', floors: ['Ground Floor'], existingFloors: [] });
    setShowBuildingModal(true);
  };

  const openEditBuilding = async (building) => {
    setEditBuilding(building);
    const existingFloors = floors[building.id] || [];
    setBuildingForm({
      name: building.name,
      code: building.code,
      description: building.description || '',
      floors: [],
      existingFloors: existingFloors.map(f => ({ id: f.id, floor_number: f.floor_number, name: f.name || `Floor ${f.floor_number}` }))
    });
    setShowBuildingModal(true);
  };

  const deleteBuilding = (id) => {
    const roomsInBuilding = rooms.filter(r => r.building_id === id);
    const message = roomsInBuilding.length > 0
      ? `This building has ${roomsInBuilding.length} room(s). Deleting it will remove all rooms. Continue?`
      : 'Are you sure you want to delete this building?';
    setConfirmDelete({ type: 'building', id, message });
  };

  const [pendingFloorDelete, setPendingFloorDelete] = useState(null);

  const removeExistingFloor = (floorId, index) => {
    const floorRooms = rooms.filter(r => r.floor_id === floorId);
    if (floorRooms.length > 0) {
      toast.error(`Cannot delete — ${floorRooms.length} room(s) are on this floor`);
      return;
    }
    setPendingFloorDelete({ floorId, index });
    setConfirmDelete({ type: 'floor', id: floorId, message: 'Are you sure you want to delete this floor?' });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = confirmDelete;
    try {
      if (type === 'room') {
        await api.delete(`/rooms/${id}`);
        toast.success('Room deleted');
      } else if (type === 'building') {
        await api.delete(`/buildings/${id}`);
        toast.success('Building deleted');
      } else if (type === 'floor') {
        await api.delete(`/buildings/floors/${id}`);
        if (pendingFloorDelete) {
          const updated = [...buildingForm.existingFloors];
          updated.splice(pendingFloorDelete.index, 1);
          setBuildingForm({ ...buildingForm, existingFloors: updated });
          setPendingFloorDelete(null);
        }
        toast.success('Floor deleted');
      }
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
      setConfirmDelete(null);
    }
  };

  // Room type CRUD
  const openAddType = () => {
    setEditType(null);
    setTypeForm({ name: '', base_price: '', max_guests: 2, description: '' });
    setShowTypeModal(true);
  };

  const openEditType = (t) => {
    setEditType(t);
    setTypeForm({ name: t.name, base_price: t.base_price || '', max_guests: t.max_guests || 2, description: t.description || '' });
    setShowTypeModal(true);
  };

  const saveType = async (e) => {
    e.preventDefault();
    try {
      if (editType) {
        await api.put(`/rooms/types/${editType.id}`, typeForm);
        toast.success('បានកែប្រែប្រភេទបន្ទប់');
      } else {
        await api.post('/rooms/types', typeForm);
        toast.success('បានបង្កើតប្រភេទបន្ទប់');
      }
      setShowTypeModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'កំហុស');
    }
  };

  const saveBuilding = async (e) => {
    e.preventDefault();
    try {
      if (editBuilding) {
        // Update building
        await api.put(`/buildings/${editBuilding.id}`, {
          name: buildingForm.name,
          code: buildingForm.code,
          description: buildingForm.description,
          is_active: editBuilding.is_active !== undefined ? editBuilding.is_active : true
        });

        // Add new floors
        const maxFloorNum = buildingForm.existingFloors.length > 0
          ? Math.max(...buildingForm.existingFloors.map(f => f.floor_number))
          : 0;
        for (let i = 0; i < buildingForm.floors.length; i++) {
          const floorName = buildingForm.floors[i].trim();
          if (floorName) {
            await api.post(`/buildings/${editBuilding.id}/floors`, { floor_number: maxFloorNum + i + 1, name: floorName });
          }
        }

        toast.success('Building updated');
      } else {
        // Create building
        const res = await api.post('/buildings', { name: buildingForm.name, code: buildingForm.code, description: buildingForm.description });
        const buildingId = res.data.id;

        for (let i = 0; i < buildingForm.floors.length; i++) {
          const floorName = buildingForm.floors[i].trim();
          if (floorName) {
            await api.post(`/buildings/${buildingId}/floors`, { floor_number: i + 1, name: floorName });
          }
        }

        toast.success(`Building created with ${buildingForm.floors.length} floor(s)`);
      }

      setShowBuildingModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="flex gap-2 items-center">
          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">អគារទាំងអស់</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">ស្ថានភាពទាំងអស់</option>
            <option value="available">🟢 ទំនេរ</option>
            <option value="occupied">🔵 កំពុងស្នាក់នៅ</option>
            <option value="cleaning">🟠 សម្អាត</option>
            <option value="maintenance">🔴 ជួសជុល</option>
          </select>
          <button className={`btn btn-sm ${view === 'grid' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('grid')}>Grid</button>
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('table')}>Table</button>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={openAddType}>ប្រភេទបន្ទប់</button>
            <button className="btn btn-secondary" onClick={openAddBuilding}>+ អគារ</button>
            <button className="btn btn-primary" onClick={openAdd}>+ បន្ទប់</button>
          </div>
        )}
      </div>

      {view === 'grid' ? (
        <div>
          {(filterBuilding ? buildings.filter(b => b.id === parseInt(filterBuilding)) : buildings).map(building => (
            <div key={building.id} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ display: 'inline' }}>{building.name} ({building.code})</h3>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                    {(floors[building.id] || []).length} floor(s)
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline" onClick={() => openEditBuilding(building)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteBuilding(building.id)}>Del</button>
                  </div>
                )}
              </div>
              <div className="room-grid">
                {filtered.filter(r => r.building_id === building.id).map(room => (
                  <div key={room.id} className={`room-card ${room.status}`} onClick={() => isAdmin && openEdit(room)}>
                    <div className="room-number">{room.room_number}</div>
                    <div className="room-type">{room.room_type_name}</div>
                    {room.floor_name && <div style={{ fontSize: 10, color: '#888' }}>Floor: {room.floor_name}</div>}
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      {formatPriceShort(room.price, rate)}
                    </div>
                    <span className={`badge badge-${room.status}`} style={{ marginTop: 4 }}>{room.status}</span>
                  </div>
                ))}
                {filtered.filter(r => r.building_id === building.id).length === 0 && (
                  <p style={{ color: '#999', gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>No rooms in this building</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Room</th><th>Building</th><th>Floor</th><th>Type</th><th>Price</th><th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.room_number}</strong></td>
                    <td>{r.building_name}</td>
                    <td>{r.floor_name || r.floor_number || '-'}</td>
                    <td>{r.room_type_name}</td>
                    <td>{formatPriceShort(r.price, rate)}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>Edit</button>
                          <select className="btn btn-sm btn-outline" value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="cleaning">Cleaning</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteRoom(r.id)}>Del</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editRoom ? 'Edit Room' : 'Add Room'}</h3>
            <form onSubmit={saveRoom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Room Number</label>
                  <input value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Building</label>
                  <select value={form.building_id} onChange={e => handleBuildingChange(e.target.value)} required>
                    <option value="">Select Building</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Floor</label>
                  <select value={form.floor_id} onChange={e => setForm({...form, floor_id: e.target.value})} required>
                    <option value="">{form.building_id ? (selectedBuildingFloors.length ? 'Select Floor' : 'No floors — add in building') : 'Select building first'}</option>
                    {selectedBuildingFloors.map(f => (
                      <option key={f.id} value={f.id}>{f.name || `Floor ${f.floor_number}`}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Room Type</label>
                  <select value={form.room_type_id} onChange={e => setForm({...form, room_type_id: e.target.value})} required>
                    {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>តម្លៃក្នុង១យប់ ($)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required placeholder="ឧ. 17" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editRoom ? 'Update' : 'Create'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Building Modal — Create & Edit */}
      {showBuildingModal && (
        <div className="modal-overlay" onClick={() => setShowBuildingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editBuilding ? 'Edit Building' : 'Add Building'}</h3>
            <form onSubmit={saveBuilding}>
              <div className="form-row">
                <div className="form-group">
                  <label>Building Name</label>
                  <input value={buildingForm.name} onChange={e => setBuildingForm({...buildingForm, name: e.target.value})} required placeholder="e.g. Building A" />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input value={buildingForm.code} onChange={e => setBuildingForm({...buildingForm, code: e.target.value})} required placeholder="e.g. A, B, MAIN" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={buildingForm.description} onChange={e => setBuildingForm({...buildingForm, description: e.target.value})} rows={2} />
              </div>

              {/* Existing floors (edit mode) */}
              {editBuilding && buildingForm.existingFloors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 14 }}>Current Floors</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {buildingForm.existingFloors.map((f, i) => (
                      <div key={f.id} className="flex gap-2 items-center" style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: '#666', minWidth: 50 }}>#{f.floor_number}</span>
                        <span style={{ flex: 1, fontSize: 14 }}>{f.name}</span>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeExistingFloor(f.id, i)} style={{ padding: '2px 8px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New floors to add */}
              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <div className="flex justify-between items-center">
                  <label style={{ fontWeight: 600, fontSize: 14 }}>{editBuilding ? 'Add New Floors' : 'Floors'}</label>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addFloorInput}>+ Add Floor</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {buildingForm.floors.map((floorName, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span style={{ fontSize: 13, color: '#666', minWidth: 50 }}>New</span>
                    <input
                      value={floorName}
                      onChange={e => updateFloorInput(i, e.target.value)}
                      placeholder={`Floor name (e.g. Ground, 1st, 2nd)`}
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
                      required={!editBuilding}
                    />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeFloorInput(i)} style={{ padding: '4px 8px' }}>×</button>
                  </div>
                ))}
                {buildingForm.floors.length === 0 && editBuilding && (
                  <p style={{ color: '#999', fontSize: 13 }}>Click "+ Add Floor" to add more floors</p>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary">{editBuilding ? 'Update Building' : 'Create Building'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBuildingModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Type Modal */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>{editType ? 'កែប្រែប្រភេទបន្ទប់' : 'គ្រប់គ្រងប្រភេទបន្ទប់'}</h3>

            {/* List existing types */}
            {!editType && (
              <div style={{ marginBottom: 16 }}>
                <table>
                  <thead><tr><th>ឈ្មោះ</th><th>ភ្ញៀវអតិបរមា</th><th></th></tr></thead>
                  <tbody>
                    {roomTypes.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td>{t.max_guests} នាក់</td>
                        <td><button className="btn btn-sm btn-outline" onClick={() => openEditType(t)}>កែ</button></td>
                      </tr>
                    ))}
                    {roomTypes.length === 0 && <tr><td colSpan={3} className="text-center" style={{ color: '#999' }}>គ្មានប្រភេទ</td></tr>}
                  </tbody>
                </table>
                <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 12 }}>
                  <h4 style={{ marginBottom: 12 }}>បន្ថែមប្រភេទថ្មី</h4>
                </div>
              </div>
            )}

            <form onSubmit={saveType}>
              <div className="form-row">
                <div className="form-group">
                  <label>ឈ្មោះប្រភេទ</label>
                  <input value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} required placeholder="ឧ. គ្រែមួយ, គ្រែ២" />
                </div>
                <div className="form-group">
                  <label>ភ្ញៀវអតិបរមា</label>
                  <input type="number" min="1" value={typeForm.max_guests} onChange={e => setTypeForm({...typeForm, max_guests: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>បរិយាយ</label>
                <input value={typeForm.description} onChange={e => setTypeForm({...typeForm, description: e.target.value})} placeholder="ជម្រើស" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editType ? 'រក្សាទុក' : 'បន្ថែម'}</button>
                {editType && <button type="button" className="btn btn-outline" onClick={() => { setEditType(null); setTypeForm({ name: '', base_price: '', max_guests: 2, description: '' }); }}>+ បន្ថែមថ្មី</button>}
                <button type="button" className="btn btn-secondary" onClick={() => setShowTypeModal(false)}>បិទ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!confirmDelete}
        title="បញ្ជាក់ការលុប"
        message={confirmDelete?.message}
        confirmText="លុប"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDelete(null); setPendingFloorDelete(null); }}
        variant="danger"
      />
    </div>
  );
}
