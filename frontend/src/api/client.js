const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Months
export const api = {
  months: {
    list: () => request('GET', '/months'),
    create: (year, month) => request('POST', '/months', { year, month }),
    updateNotes: (id, notes) => request('PATCH', `/months/${id}/notes`, { notes }),
    delete: (id) => request('DELETE', `/months/${id}`),
  },
  income: {
    list: (monthId) => request('GET', `/months/${monthId}/income`),
    create: (monthId, data) => request('POST', `/months/${monthId}/income`, data),
    update: (id, data) => request('PUT', `/income/${id}`, data),
    delete: (id) => request('DELETE', `/income/${id}`),
  },
  expenses: {
    list: (monthId) => request('GET', `/months/${monthId}/expenses`),
    create: (monthId, data) => request('POST', `/months/${monthId}/expenses`, data),
    update: (id, data) => request('PUT', `/expenses/${id}`, data),
    delete: (id) => request('DELETE', `/expenses/${id}`),
    applyTemplates: (monthId) =>
      request('POST', `/months/${monthId}/expenses/apply-templates`),
  },
  templates: {
    list: () => request('GET', '/templates'),
    create: (data) => request('POST', '/templates', data),
    update: (id, data) => request('PUT', `/templates/${id}`, data),
    delete: (id) => request('DELETE', `/templates/${id}`),
  },
  incomeTemplates: {
    list: () => request('GET', '/templates/income'),
    create: (data) => request('POST', '/templates/income', data),
    update: (id, data) => request('PUT', `/templates/income/${id}`, data),
    delete: (id) => request('DELETE', `/templates/income/${id}`),
  },
  overview: {
    get: (year) => request('GET', `/overview/${year}`),
  },
  trend: {
    get: (year, month, n = 6) => request('GET', `/trend/${year}/${month}?n=${n}`),
  },
  sheetsSync: {
    month: (monthId) => request('POST', `/sheets-sync/month/${monthId}`),
    year: (year) => request('POST', `/sheets-sync/year/${year}`),
  },
  backup: {
    // Returns { blob, filename } so the caller can hand it to the browser as a download
    download: async () => {
      const res = await fetch(`${BASE}/backup`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const match = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '');
      return { blob: await res.blob(), filename: match ? match[1] : 'finance-backup.db' };
    },
  },
  import: {
    month: async (monthId, csvText, format = 'new') => {
      const res = await fetch(`/api/import/month/${monthId}?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvText,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
  },
};
