/**
 * pages/admin/main.js — Admin user management
 */
import { html, createRoot, useState, useCallback } from '../../lib/react.js';
import { Toast }          from '../../shared/Toast.js';
import { ErrorBoundary }  from '../../shared/ErrorBoundary.js';

const API = '../admin/save.php';

async function adminPost(action, body = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Unknown error');
  return json.data ?? null;
}

// ── Role badge ────────────────────────────────────────────────
function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return html`
    <span style="font-size:.6rem;border-radius:4px;padding:2px 7px;font-weight:600;
                 background:${isAdmin ? '#0f2a1a' : 'var(--bg3)'};
                 color:${isAdmin ? '#86efac' : 'var(--t3)'};
                 border:1px solid ${isAdmin ? '#16a34a55' : 'var(--bd)'}">
      ${isAdmin ? '👑 Admin' : 'User'}
    </span>
  `;
}

// ── UserRow ───────────────────────────────────────────────────
function UserRow({ user, isSelf, onToast, onUpdated }) {
  const [busy, setBusy] = useState(false);

  async function run(action, extra) {
    setBusy(true);
    try {
      await adminPost(action, { user_id: user.id, ...extra });
      onUpdated();
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleRole = () =>
    run('set_role', { role: user.role === 'admin' ? 'user' : 'admin' });

  const toggleActive = () =>
    run('set_active', { is_active: !user.is_active });

  return html`
    <div style="background:var(--bg2);border:1px solid ${user.is_active ? 'var(--bd)' : '#7f1d1d55'};border-radius:var(--r);padding:.85rem;margin-bottom:.5rem;opacity:${user.is_active ? 1 : .6}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.3rem">
            <span style="font-size:.88rem;color:#f8fafc">${user.name}</span>
            <${RoleBadge} role=${user.role} />
            ${isSelf && html`<span style="font-size:.6rem;color:var(--c2);border:1px solid var(--c2);border-radius:4px;padding:1px 6px">you</span>`}
            ${!user.is_active && html`<span style="font-size:.6rem;color:#fb7185;border:1px solid #fb718544;border-radius:4px;padding:1px 6px">inactive</span>`}
          </div>
          <div style="font-size:.7rem;color:var(--t4)">${user.email}</div>
          <div style="font-size:.6rem;color:var(--t4);margin-top:.2rem">
            Joined ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        ${!isSelf && html`
          <div style="display:flex;gap:.35rem;flex-wrap:wrap;flex-shrink:0">
            <button class="btn btn-ghost" style="font-size:.68rem;padding:.35rem .65rem;min-height:32px"
                    disabled=${busy} onClick=${toggleRole}>
              ${user.role === 'admin' ? '↓ Make User' : '↑ Make Admin'}
            </button>
            <button class="btn btn-ghost" style="font-size:.68rem;padding:.35rem .65rem;min-height:32px;color:${user.is_active ? '#f97316' : 'var(--c2)'}"
                    disabled=${busy} onClick=${toggleActive}>
              ${user.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// ── AddUserForm ───────────────────────────────────────────────
function AddUserForm({ onAdded, onToast }) {
  const [form,   setForm]   = useState({ name:'', email:'', password:'', role:'user' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    const errs = {};
    if (!form.name.trim())                          errs.name     = 'Required';
    if (!form.email.includes('@'))                  errs.email    = 'Valid email required';
    if (form.password.length < 8)                   errs.password = 'Min 8 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      const user = await adminPost('add_user', form);
      setForm({ name:'', email:'', password:'', role:'user' });
      onAdded(user);
      onToast('User created ✓');
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const ErrMsg = ({ field }) => errors[field]
    ? html`<div style="font-size:.65rem;color:#fb7185;margin-top:.2rem">${errors[field]}</div>`
    : null;

  return html`
    <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:1rem;margin-bottom:1.25rem">
      <div style="font-size:.82rem;color:#f8fafc;margin-bottom:.85rem">Add New User</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.65rem">
        <div class="field" style="flex:1;min-width:140px">
          <label>Name *</label>
          <input type="text" value=${form.name} onChange=${e => setField('name', e.target.value)}
                 placeholder="Full name" maxLength="200" />
          <${ErrMsg} field="name" />
        </div>
        <div class="field" style="flex:1.5;min-width:180px">
          <label>Email *</label>
          <input type="email" value=${form.email} onChange=${e => setField('email', e.target.value)}
                 placeholder="user@example.com" />
          <${ErrMsg} field="email" />
        </div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.85rem">
        <div class="field" style="flex:1;min-width:140px">
          <label>Password *</label>
          <input type="password" value=${form.password} onChange=${e => setField('password', e.target.value)}
                 placeholder="Min 8 characters" />
          <${ErrMsg} field="password" />
        </div>
        <div class="field" style="flex:1;min-width:120px">
          <label>Role</label>
          <select value=${form.role} onChange=${e => setField('role', e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" disabled=${saving} onClick=${submit}>
        ${saving ? 'Creating…' : 'Create User'}
      </button>
    </div>
  `;
}

// ── AdminApp ──────────────────────────────────────────────────
function AdminApp({ boot }) {
  const [users,       setUsers]       = useState(boot.users);
  const [showAdd,     setShowAdd]     = useState(false);
  const [toast,       setToast]       = useState(null);
  const [search,      setSearch]      = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  function onAdded(u)    { setUsers(prev => [u, ...prev]); setShowAdd(false); }
  function onUpdated()   { location.reload(); } // simplest: reload to reflect changes

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
               u.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter(u => u.role === 'admin');
  const others = filtered.filter(u => u.role !== 'admin');

  return html`
    <div>
      <!-- Toolbar -->
      <div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.85rem;flex-wrap:wrap">
        <input type="search" value=${search} onChange=${e => setSearch(e.target.value)}
               placeholder="Search users…"
               style="flex:1;min-width:160px;background:var(--bg2);border:1px solid var(--bd2);border-radius:var(--rs);padding:.55rem .75rem;color:var(--tx);font-size:16px;min-height:42px" />
        <button class="btn btn-primary" style="min-height:42px"
                onClick=${() => setShowAdd(!showAdd)}>
          ${showAdd ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      ${showAdd && html`<${AddUserForm} onAdded=${onAdded} onToast=${showToast} />`}

      <!-- Admin accounts first -->
      ${admins.length > 0 && html`
        <div style="font-size:.6rem;color:var(--t4);letter-spacing:.15em;text-transform:uppercase;margin-bottom:.5rem">
          Admins (${admins.length})
        </div>
        ${admins.map(u => html`
          <${UserRow} key=${u.id} user=${u}
            isSelf=${u.id === boot.currentId}
            onToast=${showToast} onUpdated=${onUpdated} />
        `)}
        <div style="height:.75rem"></div>
      `}

      <!-- Regular users -->
      <div style="font-size:.6rem;color:var(--t4);letter-spacing:.15em;text-transform:uppercase;margin-bottom:.5rem">
        Users (${others.length})
      </div>
      ${others.length === 0 && html`
        <div style="text-align:center;padding:2rem;color:var(--t3);font-size:.82rem">
          ${search ? 'No users match your search.' : 'No regular users yet.'}
        </div>
      `}
      ${others.map(u => html`
        <${UserRow} key=${u.id} user=${u}
          isSelf=${u.id === boot.currentId}
          onToast=${showToast} onUpdated=${onUpdated} />
      `)}

      <${Toast} message=${toast} />
    </div>
  `;
}

// ── Mount ─────────────────────────────────────────────────────
const root = document.getElementById('app');
if (root && window.ADMIN_BOOT) {
  createRoot(root).render(html`
    <${ErrorBoundary}>
      <${AdminApp} boot=${window.ADMIN_BOOT} />
    <//>
  `);
}
