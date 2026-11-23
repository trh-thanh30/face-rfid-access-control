export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function StatePanel({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <div className="state-panel" role="status">
        <span className="spinner" /> Đang đồng bộ dữ liệu…
      </div>
    );
  if (error)
    return (
      <div className="state-panel error-panel" role="alert">
        <strong>Không thể tải dữ liệu</strong>
        <span>{error}</span>
        {onRetry ? <button onClick={onRetry}>Thử lại</button> : null}
      </div>
    );
  if (empty)
    return (
      <div className="state-panel">
        <strong>Chưa có dữ liệu</strong>
        <span>Hãy tạo bản ghi đầu tiên để bắt đầu vận hành.</span>
      </div>
    );
  return null;
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status status-${value.toLowerCase().replaceAll("_", "-")}`}
    >
      <span aria-hidden="true" />
      {value}
    </span>
  );
}
export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}
