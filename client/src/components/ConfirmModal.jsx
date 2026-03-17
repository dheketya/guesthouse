const variantClassMap = {
  danger: 'btn-danger',
  success: 'btn-success',
  primary: 'btn-primary',
};

export default function ConfirmModal({ open, title, message, children, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  if (!open) return null;

  const confirmBtnClass = variantClassMap[variant] || 'btn-danger';

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) (onCancel)(); }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        {title && <h3 style={{ marginBottom: 12 }}>{title}</h3>}
        {message && <p style={{ color: '#555', marginBottom: 16, lineHeight: 1.5 }}>{message}</p>}
        {children && <div style={{ marginBottom: 16 }}>{children}</div>}
        <div className="form-actions">
          <button className={`btn ${confirmBtnClass}`} onClick={onConfirm}>{confirmText}</button>
          <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
}
