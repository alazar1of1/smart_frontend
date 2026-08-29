export default function StatusBadge({ status }) {
  const map = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    resolved: 'Resolved',
  };
  const cls = {
    pending: 'badge badge-pending',
    'in-progress': 'badge badge-in-progress',
    resolved: 'badge badge-resolved',
  };
  return <span className={cls[status] || 'badge'}>{map[status] || status}</span>;
}
