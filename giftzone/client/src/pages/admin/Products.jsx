import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiStar, FiX, FiUpload } from 'react-icons/fi';
import { categoryService, productService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { PageHeader, Table } from '../../components/admin';
import { ConfirmModal, ErrorBox, FieldError, Modal, PageLoader, Pagination, Spinner } from '../../components/ui';
import SafeImage from '../../components/SafeImage';
import { money } from '../../utils/format';

function ProductForm({ product, categories, onSaved, onClose }) {
  const editing = !!product;
  const [images, setImages] = useState(product?.images || []); // already-stored image URLs, in order
  const [files, setFiles] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [specs, setSpecs] = useState(Object.entries(product?.specifications || {}).map(([k, v]) => ({ k, v: String(v) })));
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: product?.name || '', category_id: product?.category_id || '', price: product?.price ?? '', discount_price: product?.discount_price ?? '',
      stock: product?.stock ?? 0, occasion: product?.occasion || '', description: product?.description || '', is_featured: !!product?.is_featured,
    },
  });
  const price = watch('price');

  const addUrl = () => {
    if (!/^https:\/\/\S+$/i.test(urlInput.trim())) return toast.error('Enter a full https:// image URL');
    setImages((i) => [...i, urlInput.trim()]); setUrlInput('');
  };
  const onFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const bad = picked.find((f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024);
    if (bad) toast.error(`${bad.name}: only JPG/PNG/WEBP up to 5MB`);
    setFiles((f) => [...f, ...picked.filter((x) => x !== bad)].slice(0, 8));
    e.target.value = '';
  };

  const onSubmit = async (d) => {
    if (images.length + files.length === 0) return toast.error('Add at least one product image');
    const fd = new FormData();
    ['name', 'category_id', 'price', 'stock', 'occasion', 'description'].forEach((k) => fd.append(k, d[k] ?? ''));
    fd.append('discount_price', d.discount_price === '' || d.discount_price == null ? '' : d.discount_price);
    fd.append('is_featured', d.is_featured ? 'true' : 'false');
    fd.append('specifications', JSON.stringify(Object.fromEntries(specs.filter((s) => s.k.trim()).map((s) => [s.k.trim(), s.v]))));
    // Stored uploads stay as "kept"; pasted https URLs go in image_urls; new files are appended by the server.
    fd.append('existing_images', JSON.stringify(images.filter((u) => u.startsWith('/uploads/'))));
    fd.append('image_urls', JSON.stringify(images.filter((u) => !u.startsWith('/uploads/'))));
    files.forEach((f) => fd.append('images', f));
    try {
      editing ? await productService.update(product.id, fd) : await productService.create(fd);
      toast.success(editing ? 'Product updated' : 'Product created');
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const fieldCls = (n) => `input ${errors[n] ? 'input-error' : ''}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-6 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><label className="label">Product name</label><input className={fieldCls('name')} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} /><FieldError error={errors.name} /></div>
      <div><label className="label">Category</label><select className={fieldCls('category_id')} {...register('category_id', { required: 'Choose a category' })}><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><FieldError error={errors.category_id} /></div>
      <div><label className="label">Occasion</label><input className="input" placeholder="Birthday, Wedding…" {...register('occasion')} /></div>
      <div><label className="label">Price ($)</label><input type="number" step="0.01" min="0" className={fieldCls('price')} {...register('price', { required: 'Price is required', min: { value: 0, message: 'Must be 0 or more' } })} /><FieldError error={errors.price} /></div>
      <div><label className="label">Discount price ($)</label><input type="number" step="0.01" min="0" className={fieldCls('discount_price')} placeholder="Leave empty for none" {...register('discount_price', { validate: (v) => v === '' || v == null || Number(v) <= Number(price) || 'Cannot exceed the regular price' })} /><FieldError error={errors.discount_price} /></div>
      <div><label className="label">Stock</label><input type="number" min="0" step="1" className={fieldCls('stock')} {...register('stock', { required: 'Stock is required', min: { value: 0, message: 'Must be 0 or more' } })} /><FieldError error={errors.stock} /></div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand" {...register('is_featured')} /> Featured product</label>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea rows={3} className="input" {...register('description')} /></div>

      <div className="sm:col-span-2">
        <label className="label">Specifications</label>
        <div className="space-y-2">{specs.map((s, i) => (
          <div key={i} className="flex gap-2"><input className="input" placeholder="Name" value={s.k} onChange={(e) => setSpecs((a) => a.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} /><input className="input" placeholder="Value" value={s.v} onChange={(e) => setSpecs((a) => a.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /><button type="button" aria-label="Remove row" className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" onClick={() => setSpecs((a) => a.filter((_, j) => j !== i))}><FiX /></button></div>
        ))}</div>
        <button type="button" className="mt-2 text-sm font-semibold text-brand hover:underline" onClick={() => setSpecs((a) => [...a, { k: '', v: '' }])}>+ Add specification</button>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Images <span className="font-normal text-ink-soft">(first image is the cover, max 8)</span></label>
        <div className="flex flex-wrap gap-3">
          {images.map((u, i) => (
            <div key={u + i} className="group relative h-20 w-20 overflow-hidden rounded-xl bg-brand-soft">
              <SafeImage src={u} alt="" width={200} />
              {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-brand/90 text-center text-[10px] font-bold text-white">COVER</span>}
              <button type="button" aria-label="Remove image" onClick={() => setImages((a) => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white p-1 text-xs shadow"><FiX /></button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={f.name + i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-brand-soft"><img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-ink/70 text-center text-[10px] text-white">NEW</span>
              <button type="button" aria-label="Remove image" onClick={() => setFiles((a) => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white p-1 text-xs shadow"><FiX /></button></div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-xs text-ink-soft transition hover:border-brand hover:text-brand"><FiUpload className="text-lg" />Upload<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} /></label>
        </div>
        <div className="mt-3 flex gap-2"><input className="input" placeholder="…or paste an https:// image URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())} /><button type="button" className="btn-outline btn-sm" onClick={addUrl}>Add</button></div>
      </div>

      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} {editing ? 'Save changes' : 'Create product'}</button></div>
    </form>
  );
}

export default function Products() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const categories = useFetch(() => categoryService.list(), []);
  const list = useFetch(() => productService.list({ q: dq, page, limit: 10, sort: 'newest' }), [dq, page]);
  useEffect(() => setPage(1), [dq]);

  const openEdit = async (p) => {
    try { setEditing(await productService.one(p.id)); } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async () => {
    setBusy(true);
    try { await productService.remove(toDelete.id); toast.success('Product deleted'); setToDelete(null); list.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Products" subtitle="Manage your catalogue, prices, discounts and stock" action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}><FiPlus /> Add product</button>} />
      <div className="relative mb-4 max-w-sm"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" className="input rounded-full pl-11" /></div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <>
          <Table head={['Product', 'Category', 'Price', 'Stock', 'Featured', '']} empty={list.data.items.length ? null : 'No products found.'}>
            {list.data.items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={p.image} alt="" width={120} /></span><span className="max-w-[16rem] truncate font-semibold">{p.name}</span></div></td>
                <td className="px-4 py-3 text-ink-soft">{p.category_name}</td>
                <td className="px-4 py-3">{money(p.final_price)}{p.discount_price != null && <span className="ml-1 text-xs text-gray-400 line-through">{money(p.price)}</span>}</td>
                <td className="px-4 py-3"><span className={`badge ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.stock}</span></td>
                <td className="px-4 py-3">{p.is_featured ? <FiStar className="text-gold" /> : <span className="text-gray-300">-</span>}</td>
                <td className="px-4 py-3 text-right"><button aria-label={`Edit ${p.name}`} className="rounded-full p-2 hover:bg-brand-soft hover:text-brand" onClick={() => openEdit(p)}><FiEdit2 /></button><button aria-label={`Delete ${p.name}`} className="rounded-full p-2 hover:bg-red-50 hover:text-red-500" onClick={() => setToDelete(p)}><FiTrash2 /></button></td>
              </tr>
            ))}
          </Table>
          <Pagination page={list.data.page} pages={list.data.pages} onChange={setPage} />
        </>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add product' : 'Edit product'} wide>
        {editing && <ProductForm key={editing.id || 'new'} product={editing === 'new' ? null : editing} categories={categories.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
      </Modal>
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete product?" message={`“${toDelete?.name}” will be removed from the store. Past orders keep their own copy of the details.`} confirmLabel="Delete" danger busy={busy} onConfirm={del} />
    </>
  );
}
