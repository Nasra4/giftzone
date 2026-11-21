import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiMail, FiTrash2 } from 'react-icons/fi';
import { adminService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { PageHeader, Table } from '../../components/admin';
import { ConfirmModal, ErrorBox, PageLoader } from '../../components/ui';
import { fmtDateTime, fmtDate } from '../../utils/format';

export default function Messages() {
  const messages = useFetch(() => adminService.messages(), []);
  const subs = useFetch(() => adminService.subscribers(), []);
  const [toDelete, setToDelete] = useState(null);

  const del = async () => {
    try { await adminService.removeMessage(toDelete.id); toast.success('Message deleted'); setToDelete(null); messages.reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (messages.loading && !messages.data) return <PageLoader />;
  if (messages.error) return <ErrorBox message={messages.error} onRetry={messages.reload} />;

  return (
    <>
      <PageHeader title="Messages" subtitle="Messages sent from the Contact page, newest first" />
      <div className="space-y-3">
        {messages.data.length === 0 && <p className="card p-8 text-center text-sm text-ink-soft">No messages yet.</p>}
        {messages.data.map((m) => (
          <article key={m.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{m.subject || 'No subject'}</p>
                <p className="text-sm text-ink-soft">{m.name} · <a className="text-brand hover:underline" href={`mailto:${m.email}`}>{m.email}</a> · {fmtDateTime(m.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <a className="btn-primary btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Your message to GiftZone'}`)}`}><FiMail /> Reply</a>
                <button className="btn btn-sm border-2 border-red-300 text-red-500 hover:bg-red-50" onClick={() => setToDelete(m)} aria-label="Delete message"><FiTrash2 /></button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-cream p-4 text-sm leading-relaxed">{m.message}</p>
          </article>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl">Newsletter subscribers {subs.data && <span className="text-sm text-ink-soft">({subs.data.length})</span>}</h2>
      {subs.data && <Table head={['Email', 'Subscribed']} empty={subs.data.length ? null : 'No subscribers yet.'}>
        {subs.data.map((s) => <tr key={s.id}><td className="px-4 py-3">{s.email}</td><td className="px-4 py-3 text-ink-soft">{fmtDate(s.created_at)}</td></tr>)}
      </Table>}

      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} message="Delete this message permanently?" confirmLabel="Delete" danger onConfirm={del} />
    </>
  );
}