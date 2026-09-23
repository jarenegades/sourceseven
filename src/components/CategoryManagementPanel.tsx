import { useEffect, useMemo, useState } from 'react';
import { Edit2, FolderPlus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { categoriesService, StoreCategory } from '../utils/categoriesService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';

export function CategoryManagementPanel() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('rolling-bearings');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('0');
  const [editing, setEditing] = useState<StoreCategory | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      setCategories(await categoriesService.getAll());
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Could not load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const groups = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const childrenFor = (id: string) => categories.filter((category) => category.parent_id === id);
  const parentOptions = categories.filter((category) => !category.parent_id || groups.some((group) => group.id === category.parent_id));

  const addCategory = async () => {
    if (!name.trim()) return toast.error('Enter a category name');
    setSaving(true);
    try {
      await categoriesService.create({ name, parentId, description, displayOrder: Number(order) || 0 });
      setName('');
      setDescription('');
      setOrder('0');
      await loadCategories();
      toast.success('Category added to the storefront');
    } catch (error: any) {
      toast.error(error.message?.includes('duplicate') ? 'A category with that name already exists' : 'Could not add category');
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      await categoriesService.update(editing.id, {
        name: editing.name.trim(),
        description: editing.description || null,
        display_order: Number(editing.display_order) || 0,
        is_active: editing.is_active,
      });
      setEditing(null);
      await loadCategories();
      toast.success('Category saved');
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Could not save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>Create and manage up to three category levels: department, category, and subcategory.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="rounded-lg border bg-slate-50 p-4">
          <h3 className="font-medium text-[#003366] mb-1">Create a new category or subcategory</h3>
          <p className="mb-4 text-sm text-slate-600">Choose a department or category as the parent. Categories cannot exceed three levels.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="category-name">New category name</Label><Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Insert Bearings" /></div>
            <div className="grid gap-2"><Label>Parent category</Label><Select value={parentId} onValueChange={setParentId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{parentOptions.map((parent) => <SelectItem key={parent.id} value={parent.id}>{parent.parent_id ? `↳ ${parent.name}` : parent.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="category-description">Description (optional)</Label><Textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short customer-facing description" /></div>
            <div className="grid gap-2"><Label htmlFor="category-order">Display order</Label><Input id="category-order" type="number" value={order} onChange={(event) => setOrder(event.target.value)} /></div>
          </div>
          <Button className="mt-4 bg-[#003366] hover:bg-[#004488]" onClick={addCategory} disabled={saving}><FolderPlus className="mr-2 h-4 w-4" />Create Category</Button>
        </div>

        <div className="space-y-5">
          {loading ? <p className="text-sm text-gray-500">Loading categories…</p> : groups.map((group) => (
            <div key={group.id} className="rounded-lg border">
              <div className="flex items-center justify-between bg-[#003366] px-4 py-3 text-white"><span className="font-medium">{group.name}</span><span className="text-xs text-blue-100">{childrenFor(group.id).length} categories</span></div>
              <div className="divide-y">
                {childrenFor(group.id).map((category) => (
                  <div key={category.id} className="flex items-center justify-between gap-4 p-4">
                    <div><p className="font-medium text-slate-900">{category.name} {!category.is_active && <span className="ml-2 text-xs font-normal text-amber-700">Archived</span>}</p>{category.description && <p className="mt-1 text-sm text-slate-500">{category.description}</p>}{childrenFor(category.id).map((child) => <p key={child.id} className="mt-1 pl-4 text-sm text-slate-600">↳ {child.name}</p>)}</div>
                    <Button variant="outline" size="sm" onClick={() => setEditing({ ...category })}><Edit2 className="mr-2 h-4 w-4" />Edit</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {editing && <div className="rounded-lg border border-[#003366] bg-white p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-medium text-[#003366]">Edit {editing.name}</h3><Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button></div><div className="grid gap-4 md:grid-cols-2"><div className="grid gap-2"><Label>Name</Label><Input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></div><div className="grid gap-2"><Label>Display order</Label><Input type="number" value={editing.display_order} onChange={(event) => setEditing({ ...editing, display_order: Number(event.target.value) })} /></div><div className="grid gap-2 md:col-span-2"><Label>Description</Label><Textarea value={editing.description || ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></div><div className="flex items-center gap-3"><Switch checked={editing.is_active} onCheckedChange={(is_active) => setEditing({ ...editing, is_active })} /><Label>Visible in storefront</Label></div></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button className="bg-[#003366] hover:bg-[#004488]" onClick={saveCategory} disabled={saving}><Save className="mr-2 h-4 w-4" />Save Category</Button></div></div>}
      </CardContent>
    </Card>
  );
}
