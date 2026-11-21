import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUpload } from 'react-icons/fi';
import { categoryService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { PageHeader } from '../../components/admin';
import { ConfirmModal, ErrorBox, FieldError, Modal, PageLoader, Spinner } from '../../components/ui';
import SafeImage from '../../components/SafeImage';

function CategoryForm({ category, onSaved, onClose }) {
  const [file, setFile] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: category?.name || '', description: category?.description || '', image_url: category?.image_url?.startsWith('http') ? category.image_url : '' } });
  const onSubmit = async (d) => {
    const fd = new FormData();
    fd.append('name', d.name); fd.append('description', d.description || '');
    if (file) fd.append('image', file); else if (d.image_url) fd.append('image_url', d.image_url);
    try {
      category ? await categoryService.update(category.id, fd) : await categoryService.create(fd);
      toast.success('Category saved'); onSaved();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6" noValidate>
      <div><label className="label">Name</label><input className={`input ${errors.name ? 'input-error' : ''}`} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} /><FieldError error={errors.name} /></div>
      <div><label className="label">Description</label><input className="input" maxLength={255} {...register('description')} /></div>
      <div>
        <label className="label">Category image</label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-3 text-sm text-ink-soft hover:border-brand"><FiUpload /> {file ? file.name : 'Upload JPG, PNG or WEBP (max 5MB)'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB'); setFile(f || null); }} /></label>
        <input className="input mt-2" placeholder="…or paste an https:// image URL" {...register('image_url', { pattern: { value: /^(https:\/\/\S+)?$/, message: 'Must start with https://' } })} />
        <FieldError error={errors.image_url} />
      </div>
      <div className="flex justify-end gap-3"><button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Save</button></div>
    </form>
  );
}

export default function Categories() {
  const { data, loading, error, reload } = useFetch(() => categoryService.list(), []);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const del = async () => {
    try { await categoryService.remove(toDelete.id); toast.success('Category deleted'); setToDelete(null); reload(); } catch (e) { toast.error(errMsg(e)); setToDelete(null); }
  };
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Categories" subtitle="Group your gifts so customers can find them" action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}><FiPlus /> Add category</button>} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            <div className="aspect-[16/8] bg-brand-soft"><SafeImage src={c.image_url} alt={c.name} width={600} /></div>
            <div className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-ink-soft">{c.product_count} product{c.product_count === 1 ? '' : 's'}</p></div>
              <div className="shrink-0"><button aria-label={`Edit ${c.name}`} className="rounded-full p-2 hover:bg-brand-soft hover:text-brand" onClick={() => setEditing(c)}><FiEdit2 /></button><button aria-label={`Delete ${c.name}`} className="rounded-full p-2 hover:bg-red-50 hover:text-red-500" onClick={() => setToDelete(c)}><FiTrash2 /></button></div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add category' : 'Edit category'}>
        {editing && <CategoryForm key={editing.id || 'new'} category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      </Modal>
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete category?" message={`Delete “${toDelete?.name}”? Categories that still contain products can't be deleted.`} confirmLabel="Delete" danger onConfirm={del} />
    </>
  );
}
