import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CheckSquare, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from './ProductCard';
import { commerceSettingsService, PaymentMethodSetting } from '../utils/commerceSettingsService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

export function CommerceSettingsPanel({ products }: { products: Product[] }) {
  const [payments, setPayments] = useState<PaymentMethodSetting[]>([]);
  const [quoteIds, setQuoteIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'price' | 'quote'>('all');
  const [search, setSearch] = useState('');
  const [savingPayments, setSavingPayments] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [methods, pricing] = await Promise.all([commerceSettingsService.getAllPaymentMethods(), commerceSettingsService.getPricingSettings()]);
      setPayments(methods);
      setQuoteIds(new Set(pricing.filter((setting) => setting.purchase_mode === 'quote').map((setting) => setting.product_id)));
    } catch (error) { console.error('Failed to load commerce settings:', error); toast.error('Could not load commerce settings'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    products.forEach((product) => {
      if (product.category) options.set(`department:${product.category}`, product.category === 'rolling-bearings' ? 'Rolling Bearings' : 'Mounted & Linear Units');
      if (product.categoryId) options.set(`category:${product.categoryId}`, product.categoryId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
    });
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [products]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = !search.trim() || product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (categoryFilter.startsWith('department:') ? product.category === categoryFilter.slice(11) : product.categoryId === categoryFilter.slice(9));
    const mode = quoteIds.has(product.id) ? 'quote' : 'price';
    return matchesSearch && matchesCategory && (modeFilter === 'all' || mode === modeFilter);
  }), [products, search, categoryFilter, modeFilter, quoteIds]);

  const savePayments = async () => { setSavingPayments(true); try { await commerceSettingsService.savePaymentMethods(payments); toast.success('Payment options saved'); } catch (error) { console.error(error); toast.error('Could not save payment options'); } finally { setSavingPayments(false); } };
  const applyMode = async (ids: string[], mode: 'price' | 'quote') => {
    if (!ids.length) return toast.error('Select products or adjust the filters first');
    setBulkSaving(true);
    try {
      await commerceSettingsService.setProductPurchaseModes(ids, mode);
      setQuoteIds((current) => { const next = new Set(current); ids.forEach((id) => mode === 'quote' ? next.add(id) : next.delete(id)); return next; });
      setSelectedIds(new Set());
      toast.success(`${ids.length} product${ids.length === 1 ? '' : 's'} set to ${mode === 'quote' ? 'Request a Quote' : 'Pricing'}`);
    } catch (error) { console.error(error); toast.error('Could not update product pricing mode'); }
    finally { setBulkSaving(false); }
  };
  const selectedOrFilteredIds = selectedIds.size > 0 ? [...selectedIds] : filteredProducts.map((product) => product.id);
  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((current) => { const next = new Set(current); checked ? next.add(id) : next.delete(id); return next; });
  const toggleAllFiltered = (checked: boolean) => setSelectedIds((current) => { const next = new Set(current); filteredProducts.forEach((product) => checked ? next.add(product.id) : next.delete(product.id)); return next; });

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Payment Options</CardTitle><CardDescription>Toggle payment methods available to customers at checkout.</CardDescription></CardHeader><CardContent className="space-y-4">{loading ? <p className="text-sm text-gray-500">Loading payment options…</p> : payments.map((method) => <div key={method.code} className="flex items-center justify-between rounded-lg border p-4"><div className="flex gap-3"><BadgeDollarSign className="h-5 w-5 text-[#003366] mt-0.5" /><div><p className="font-medium">{method.name}</p><p className="text-sm text-gray-500">{method.description}</p></div></div><div className="flex items-center gap-3"><span className="text-sm text-gray-600">{method.is_active ? 'Available' : 'Disabled'}</span><Switch checked={method.is_active} onCheckedChange={(is_active) => setPayments((items) => items.map((item) => item.code === method.code ? { ...item, is_active } : item))} /></div></div>)}<div className="flex justify-end"><Button className="bg-[#003366] hover:bg-[#0055AA]" onClick={savePayments} disabled={savingPayments || loading}><Save className="mr-2 h-4 w-4" />{savingPayments ? 'Saving…' : 'Save Payment Options'}</Button></div></CardContent></Card>

    <Card><CardHeader><CardTitle>Product Pricing & Quotes</CardTitle><CardDescription>Filter by category, select products if needed, then apply Pricing or Request a Quote in bulk. With no products selected, the action applies to all filtered results.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></div><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Select value={modeFilter} onValueChange={(value) => setModeFilter(value as 'all' | 'price' | 'quote')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All pricing modes</SelectItem><SelectItem value="price">Pricing shown</SelectItem><SelectItem value="quote">Request a Quote</SelectItem></SelectContent></Select></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id))} onChange={(event) => toggleAllFiltered(event.target.checked)} /> Select all filtered ({filteredProducts.length})</label><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => applyMode(selectedOrFilteredIds, 'price')} disabled={bulkSaving}>Set Pricing</Button><Button size="sm" className="bg-[#003366] hover:bg-[#0055AA]" onClick={() => applyMode(selectedOrFilteredIds, 'quote')} disabled={bulkSaving}><CheckSquare className="mr-2 h-4 w-4" />Set Request a Quote</Button></div></div><div className="divide-y rounded-lg border max-h-[560px] overflow-y-auto">{filteredProducts.map((product) => { const quote = quoteIds.has(product.id); return <div key={product.id} className="flex items-center justify-between gap-4 p-4"><label className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selectedIds.has(product.id)} onChange={(event) => toggleSelected(product.id, event.target.checked)} /><span className="min-w-0"><span className="block truncate font-medium text-slate-900">{product.name}</span><span className="text-sm text-gray-500">{product.categoryId?.replace(/-/g, ' ') || product.category}</span></span></label><div className="flex items-center gap-3"><span className="text-sm text-gray-600">{quote ? 'Quote' : 'Pricing'}</span><Switch checked={quote} onCheckedChange={(checked) => applyMode([product.id], checked ? 'quote' : 'price')} /></div></div>; })}{filteredProducts.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No products match these filters.</p>}</div></CardContent></Card>
  </div>;
}
