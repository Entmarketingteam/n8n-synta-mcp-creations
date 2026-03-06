import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CostTip from '../components/CostTip';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES = [
  'kitchen', 'bathroom', 'flooring', 'paint', 'roof', 'hvac',
  'plumbing', 'electrical', 'windows_doors', 'landscaping', 'permits', 'other'
];

export default function RenovationBudget() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [byCategory, setByCategory] = useState({});
  const [total, setTotal] = useState(0);
  const [tips, setTips] = useState([]);
  const [templates, setTemplates] = useState({});
  const [newItem, setNewItem] = useState({ category: 'kitchen', description: '', estimatedCost: 0 });

  useEffect(() => {
    loadBudget();
    loadTips();
    loadTemplates();
  }, [id]);

  const loadBudget = async () => {
    const res = await fetch(`/api/renovation/${id}`);
    const data = await res.json();
    setItems(data.items || []);
    setByCategory(data.byCategory || {});
    setTotal(data.estimatedTotal || 0);
  };

  const loadTips = async () => {
    const res = await fetch('/api/templates/cost-tips');
    const data = await res.json();
    setTips(data.tips || []);
  };

  const loadTemplates = async () => {
    const res = await fetch('/api/templates/renovation');
    const data = await res.json();
    setTemplates(data.templates || {});
  };

  const addItem = async () => {
    if (!newItem.description) return;
    await fetch(`/api/renovation/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    setNewItem({ category: 'kitchen', description: '', estimatedCost: 0 });
    loadBudget();
  };

  const deleteItem = async (itemId) => {
    await fetch(`/api/renovation/${id}/items/${itemId}`, { method: 'DELETE' });
    loadBudget();
  };

  const applyTemplate = async (templateKey) => {
    if (!confirm(`Apply "${templates[templateKey]?.name}" template? This will replace current items.`)) return;
    await fetch(`/api/renovation/${id}/apply-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, squareFootage: 1500 }), // TODO: get from property
    });
    loadBudget();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/deals/${id}`} className="text-blue-600 text-sm">&larr; Back to Deal</Link>
          <h1 className="text-2xl font-bold">Renovation Budget</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Estimated Total</div>
          <div className="text-2xl font-bold">{fmt(total)}</div>
        </div>
      </div>

      {/* Template Selector */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Quick Start Templates</h2>
        <div className="flex gap-3">
          {Object.entries(templates).map(([key, tmpl]) => (
            <button key={key} onClick={() => applyTemplate(key)} className="btn-secondary text-sm flex-1 text-left">
              <div className="font-medium">{tmpl.name}</div>
              <div className="text-xs text-gray-500">{tmpl.description}</div>
              <div className="text-xs mt-1">{tmpl.itemCount} items | ${tmpl.estimatedCostPerSqft?.low}-${tmpl.estimatedCostPerSqft?.high}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Item */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Add Line Item</h2>
        <div className="flex gap-2 items-end">
          <div>
            <label className="input-label">Category</label>
            <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="input-label">Description</label>
            <input type="text" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className="input-field" placeholder="New countertops" />
          </div>
          <div>
            <label className="input-label">Est. Cost</label>
            <input type="number" value={newItem.estimatedCost || ''} onChange={e => setNewItem(p => ({ ...p, estimatedCost: parseFloat(e.target.value) || 0 }))} className="input-field" />
          </div>
          <button onClick={addItem} className="btn-primary">Add</button>
        </div>
      </div>

      {/* Budget by Category */}
      {CATEGORIES.map(cat => {
        const catItems = byCategory[cat];
        if (!catItems) return null;
        const catTips = tips.find(t => t.category === cat);

        return (
          <div key={cat} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold capitalize">{cat.replace(/_/g, ' ')}</h3>
              <span className="font-bold">{fmt(catItems.estimatedTotal)}</span>
            </div>
            <div className="space-y-1">
              {catItems.items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-sm">{item.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{fmt(item.estimated_cost)}</span>
                    <button onClick={() => deleteItem(item.id)} className="text-red-500 text-xs hover:underline">x</button>
                  </div>
                </div>
              ))}
            </div>
            {catTips && <CostTip category={cat} tips={catTips.tips} />}
          </div>
        );
      })}
    </div>
  );
}
