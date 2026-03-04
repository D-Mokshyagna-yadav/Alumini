import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Link } from 'react-router-dom';

const TelemetryAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (p = page, l = limit, query = q) => {
    setLoading(true);
    try {
      const res = await api.get(`/telemetry/list?page=${p}&limit=${l}&q=${encodeURIComponent(query)}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setLimit(res.data.limit || l);
    } catch (err) {
      console.error('Failed to load telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, limit, q); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Telemetry — Shares</h1>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search action/channel/resource/url" className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
          <button onClick={() => load(1, limit, q)} className="px-3 py-2 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl">Search</button>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)]">
              <th className="p-3">When</th>
              <th className="p-3">Action</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Resource</th>
              <th className="p-3">User</th>
              <th className="p-3">IP</th>
              <th className="p-3">URL</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center"><div className="flex justify-center"><div className="animate-spin h-6 w-6 rounded-full border-[3px] border-[var(--bg-tertiary)] border-t-[var(--accent)]"></div></div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center">No telemetry yet</td></tr>
            ) : items.map((it) => (
              <tr key={it._id} className="border-t border-[var(--border-color)]">
                <td className="p-3">{new Date(it.createdAt).toLocaleString()}</td>
                <td className="p-3">{it.action}</td>
                <td className="p-3">{it.channel || '—'}</td>
                <td className="p-3">{it.resourceType || '—'} {it.resourceId ? <Link to={`/${it.resourceType}s/view/${it.resourceId}`} className="ml-2 text-[var(--text-primary)]">view</Link> : null}</td>
                <td className="p-3">{it.user ? String(it.user) : 'anonymous'}</td>
                <td className="p-3">{it.ip || '—'}</td>
                <td className="p-3 break-all">{it.url || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-[var(--text-muted)]">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => { const p = Math.max(1, page-1); load(p, limit, q); }} className="px-3 py-1 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40">Prev</button>
          <div className="px-3 py-1 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] bg-[var(--bg-secondary)]">Page {page}</div>
          <button disabled={(page*limit) >= total} onClick={() => { const p = page+1; load(p, limit, q); }} className="px-3 py-1 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
};

export default TelemetryAdmin;
