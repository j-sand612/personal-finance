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
  overview: {
    get: (year) => request('GET', `/overview/${year}`),
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
