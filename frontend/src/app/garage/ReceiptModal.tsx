"use client";

interface ReceiptModalProps {
  job: {
    id: number;
    customer_name: string;
    license_plate: string;
    car_model: string;
    description: string;
    status: string;
    total_cost: number;
    payment_status: string;
    created_at: string;
    finished_at: string | null;
  };
  onClose: () => void;
}

export default function ReceiptModal({ job, onClose }: ReceiptModalProps) {
  const receiptNo = `RCP-${job.id}-${new Date().getTime().toString(36).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
  const jobDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
    : "-";
  const statusText: Record<string, string> = {
    paid: "ชำระแล้ว ✅", unpaid: "ยังไม่ชำระ ❌",
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#receipt-modal-overlay) { display: none !important; }
          #receipt-modal-overlay { position: static !important; background: none !important; }
          #receipt-modal-overlay > *:not(#receipt-card) { display: none !important; }
          #receipt-card { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="receipt-modal-overlay" onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeIn 0.3s ease",
      }}>
        <div id="receipt-card" onClick={e => e.stopPropagation()} style={{
          background: "#fff", borderRadius: 16, padding: "36px 32px",
          maxWidth: 440, width: "100%", color: "#1e293b",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          fontFamily: "'Segoe UI', 'Inter', sans-serif",
          position: "relative", maxHeight: "90vh", overflowY: "auto",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🔧</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>อู่ซ่อมรถ Sovereign</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>ใบเสร็จรับเงิน / Receipt</p>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "2px dashed #e2e8f0", margin: "16px 0" }} />

          {/* Receipt Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 16 }}>
            <div><span style={{ color: "#94a3b8" }}>เลขที่:</span> <b>{receiptNo}</b></div>
            <div style={{ textAlign: "right" }}><span style={{ color: "#94a3b8" }}>วันที่:</span> {issueDate}</div>
          </div>

          {/* Customer Info */}
          <div style={{
            background: "#f8fafc", borderRadius: 10, padding: 14,
            marginBottom: 16, border: "1px solid #e2e8f0",
          }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>ชื่อลูกค้า:</span> <b>{job.customer_name}</b>
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>ทะเบียนรถ:</span> <b>{job.license_plate}</b>
            </div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>รุ่นรถ:</span> <b>{job.car_model}</b>
            </div>
          </div>

          {/* Service Description */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>รายละเอียดบริการ</div>
            <div style={{
              background: "#f1f5f9", borderRadius: 8, padding: 12,
              fontSize: 14, lineHeight: 1.6, border: "1px solid #e2e8f0",
            }}>{job.description}</div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#64748b", marginBottom: 16 }}>
            <div>📅 วันรับรถ: {jobDate}</div>
            <div>📅 วันเสร็จ: {job.finished_at ? new Date(job.finished_at).toLocaleDateString("th-TH") : "-"}</div>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "2px dashed #e2e8f0", margin: "16px 0" }} />

          {/* Total */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 16px", background: "linear-gradient(135deg, #0f172a, #1e293b)",
            borderRadius: 12, marginBottom: 12,
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>💰 ยอดรวม</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>
              {job.total_cost.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
            </span>
          </div>

          {/* Payment Status */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{
              display: "inline-block", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: job.payment_status === "paid" ? "#dcfce7" : "#fee2e2",
              color: job.payment_status === "paid" ? "#166534" : "#991b1b",
            }}>
              {statusText[job.payment_status] || job.payment_status}
            </span>
          </div>

          {/* Dashed Separator */}
          <div style={{ borderTop: "2px dashed #e2e8f0", margin: "16px 0" }} />

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "0 0 20px" }}>
            ขอบคุณที่ใช้บริการ 🙏
          </p>

          {/* Action Buttons */}
          <div className="no-print" style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} style={{
              flex: 1, padding: 12, border: "none", borderRadius: 10,
              background: "linear-gradient(135deg, #0f172a, #334155)",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>🖨️ พิมพ์ใบเสร็จ</button>
            <button onClick={onClose} style={{
              padding: "12px 20px", border: "1px solid #e2e8f0", borderRadius: 10,
              background: "#fff", color: "#64748b", fontSize: 14, cursor: "pointer",
            }}>✕ ปิด</button>
          </div>
        </div>
      </div>
    </>
  );
}
