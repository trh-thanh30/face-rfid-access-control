const cards = [
  ["Thiết bị online", "0"],
  ["Lượt cho phép hôm nay", "0"],
  ["Lượt từ chối hôm nay", "0"],
  ["Cảnh báo cần xử lý", "0"],
] as const;

export function DashboardView() {
  return (
    <main className="dashboard">
      <header>
        <p className="muted">Mốc Week 1</p>
        <h1>Tổng quan kiểm soát ra vào</h1>
        <p className="muted">
          Dữ liệu vận hành sẽ được nối từ Week 2; màn hình này xác nhận Admin
          shell đã chạy.
        </p>
      </header>
      <section className="cards" aria-label="Chỉ số tổng quan">
        {cards.map(([label, value]) => (
          <article className="card" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
