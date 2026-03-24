import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#4f46e5',
      color: '#fff',
      padding: '0.75rem 1.25rem',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9999,
      fontSize: '0.9rem',
    }}>
      <span>A new version is available.</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#fff',
          color: '#4f46e5',
          border: 'none',
          borderRadius: '0.375rem',
          padding: '0.375rem 0.75rem',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      >
        Reload
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        style={{
          background: 'transparent',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0.25rem',
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
