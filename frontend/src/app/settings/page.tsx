"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBusinessUnits, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit } from "@/lib/api";

type IntegrationState = "connected" | "partial" | "offline";

type LocalSettings = {
  waterRate: number;
  electricRate: number;
  promptPayId: string;
  companyName: string;
  taxId: string;
  supportEmail: string;
  supportPhone: string;
  lineChannelName: string;
};

const DEFAULT_SETTINGS: LocalSettings = {
  waterRate: 17,
  electricRate: 7,
  promptPayId: "0105569000123",
  companyName: "บริษัท ซอฟเวอเรน โวลต์ จำกัด",
  taxId: "0105569000123",
  supportEmail: "support@sovereign.local",
  supportPhone: "02-000-0000",
  lineChannelName: "Sovereign OA",
};

const STORAGE_KEYS = {
  waterRate: "setting_water_rate",
  electricRate: "setting_electric_rate",
  promptPayId: "setting_promptpay_id",
  companyName: "setting_company_name",
  taxId: "setting_tax_id",
  supportEmail: "setting_support_email",
  supportPhone: "setting_support_phone",
  lineChannelName: "setting_line_channel_name",
};

const integrationRows: { name: string; status: IntegrationState; description: string }[] = [
  { name: "LINE OA", status: "partial", description: "Webhook มีแล้ว แต่ flow บริหารบัญชี/แจ้งเตือนยังควรต่อยอด" },
  { name: "PromptPay / QR", status: "partial", description: "สร้าง QR ชำระเงินได้แล้ว แต่ยังเป็นการใช้งานฝั่ง client" },
  { name: "Email Notification", status: "offline", description: "ยังไม่มี worker / mailer สำหรับส่งแจ้งเตือน" },
  { name: "SMS Notification", status: "offline", description: "ยังไม่มี gateway สำหรับส่งข้อความสั้น" },
];

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

function statusBadge(status: IntegrationState) {
  if (status === "connected") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState("");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [auditRetentionDays, setAuditRetentionDays] = useState(90);

  // Business Units CRUD States
  const [businessUnits, setBusinessUnits] = useState<{ id: number; name: string; type: string }[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<{ id: number; name: string; type: string } | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", type: "dormitory" });
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState<number | null>(null);

  const loadBusinessUnits = async () => {
    setLoadingUnits(true);
    try {
      const data = await fetchBusinessUnits();
      if (Array.isArray(data)) {
        setBusinessUnits(data);
      }
    } catch (error) {
      console.error("Error fetching business units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettings({
        waterRate: readNumber(STORAGE_KEYS.waterRate, DEFAULT_SETTINGS.waterRate),
        electricRate: readNumber(STORAGE_KEYS.electricRate, DEFAULT_SETTINGS.electricRate),
        promptPayId: readString(STORAGE_KEYS.promptPayId, DEFAULT_SETTINGS.promptPayId),
        companyName: readString(STORAGE_KEYS.companyName, DEFAULT_SETTINGS.companyName),
        taxId: readString(STORAGE_KEYS.taxId, DEFAULT_SETTINGS.taxId),
        supportEmail: readString(STORAGE_KEYS.supportEmail, DEFAULT_SETTINGS.supportEmail),
        supportPhone: readString(STORAGE_KEYS.supportPhone, DEFAULT_SETTINGS.supportPhone),
        lineChannelName: readString(STORAGE_KEYS.lineChannelName, DEFAULT_SETTINGS.lineChannelName),
      });

      const autoBackup = localStorage.getItem("setting_auto_backup");
      const retention = localStorage.getItem("setting_audit_retention");
      setAutoBackupEnabled(autoBackup ? autoBackup === "true" : true);
      setAuditRetentionDays(retention ? Number.parseInt(retention, 10) || 90 : 90);
      setTimeout(() => setMounted(true), 0);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      setTimeout(() => loadBusinessUnits(), 0);
    }
  }, [mounted]);

  const integrationSummary = useMemo(() => {
    const connected = integrationRows.filter((item) => item.status === "connected").length;
    const partial = integrationRows.filter((item) => item.status === "partial").length;
    const offline = integrationRows.filter((item) => item.status === "offline").length;
    return { connected, partial, offline };
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEYS.waterRate, String(settings.waterRate));
    localStorage.setItem(STORAGE_KEYS.electricRate, String(settings.electricRate));
    localStorage.setItem(STORAGE_KEYS.promptPayId, settings.promptPayId);
    localStorage.setItem(STORAGE_KEYS.companyName, settings.companyName);
    localStorage.setItem(STORAGE_KEYS.taxId, settings.taxId);
    localStorage.setItem(STORAGE_KEYS.supportEmail, settings.supportEmail);
    localStorage.setItem(STORAGE_KEYS.supportPhone, settings.supportPhone);
    localStorage.setItem(STORAGE_KEYS.lineChannelName, settings.lineChannelName);
    localStorage.setItem("setting_auto_backup", String(autoBackupEnabled));
    localStorage.setItem("setting_audit_retention", String(auditRetentionDays));
    setToast("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    window.setTimeout(() => setToast(""), 3000);
  };

  const exportSettings = () => {
    const payload = {
      settings,
      autoBackupEnabled,
      auditRetentionDays,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sovereign-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast("ส่งออกการตั้งค่าแล้ว");
    window.setTimeout(() => setToast(""), 3000);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.settings) {
          setSettings({
            waterRate: Number(parsed.settings.waterRate) || DEFAULT_SETTINGS.waterRate,
            electricRate: Number(parsed.settings.electricRate) || DEFAULT_SETTINGS.electricRate,
            promptPayId: String(parsed.settings.promptPayId || DEFAULT_SETTINGS.promptPayId),
            companyName: String(parsed.settings.companyName || DEFAULT_SETTINGS.companyName),
            taxId: String(parsed.settings.taxId || DEFAULT_SETTINGS.taxId),
            supportEmail: String(parsed.settings.supportEmail || DEFAULT_SETTINGS.supportEmail),
            supportPhone: String(parsed.settings.supportPhone || DEFAULT_SETTINGS.supportPhone),
            lineChannelName: String(parsed.settings.lineChannelName || DEFAULT_SETTINGS.lineChannelName),
          });
        }
        if (typeof parsed.autoBackupEnabled === "boolean") setAutoBackupEnabled(parsed.autoBackupEnabled);
        if (Number.isFinite(Number(parsed.auditRetentionDays))) {
          setAuditRetentionDays(Number(parsed.auditRetentionDays));
        }
        setToast("นำเข้าการตั้งค่าสำเร็จ");
        window.setTimeout(() => setToast(""), 3000);
      } catch {
        setToast("ไฟล์ตั้งค่าไม่ถูกต้อง");
        window.setTimeout(() => setToast(""), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setUnitForm({ name: "", type: "dormitory" });
    setShowUnitModal(true);
  };

  const handleOpenEditModal = (unit: { id: number; name: string; type: string }) => {
    setEditingUnit(unit);
    setUnitForm({ name: unit.name, type: unit.type });
    setShowUnitModal(true);
  };

  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return;

    setIsSubmittingUnit(true);
    try {
      if (editingUnit) {
        const updated = await updateBusinessUnit(editingUnit.id, unitForm);
        setToast(`แก้ไขหน่วยธุรกิจ "${updated.name}" สำเร็จ`);
      } else {
        const created = await createBusinessUnit(unitForm);
        setToast(`เพิ่มหน่วยธุรกิจ "${created.name}" สำเร็จ`);
      }
      setShowUnitModal(false);
      setTimeout(() => loadBusinessUnits(), 0);
    } catch (error) {
      console.error("Error submitting business unit:", error);
      setToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmittingUnit(false);
      window.setTimeout(() => setToast(""), 3000);
    }
  };

  const handleDeleteUnit = async (id: number) => {
    try {
      await deleteBusinessUnit(id);
      setToast("ลบหน่วยธุรกิจสำเร็จ");
      setTimeout(() => loadBusinessUnits(), 0);
    } catch (error) {
      console.error("Error deleting business unit:", error);
      setToast("เกิดข้อผิดพลาดในการลบหน่วยธุรกิจ");
    } finally {
      setDeletingUnitId(null);
      window.setTimeout(() => setToast(""), 3000);
    }
  };

  if (!mounted) return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-bold">กำลังโหลดการตั้งค่า...</div>;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-end">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-3 inline-block">
            System Settings
          </span>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบ</h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการอัตราค่าน้ำ/ค่าไฟ ข้อมูลธุรกิจ การแจ้งเตือน และการสำรองข้อมูล
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveSettings}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-600/20"
          >
            บันทึกการตั้งค่า
          </button>
          <button
            onClick={exportSettings}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
          >
            ส่งออก JSON
          </button>
          <label className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black cursor-pointer">
            นำเข้า JSON
            <input type="file" accept="application/json" className="hidden" onChange={importSettings} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Integrations connected" value={integrationSummary.connected} tone="text-emerald-600" />
        <SummaryCard label="Integrations partial" value={integrationSummary.partial} tone="text-amber-600" />
        <SummaryCard label="Integrations offline" value={integrationSummary.offline} tone="text-slate-500" />
        <SummaryCard label="Audit retention" value={auditRetentionDays} suffix="days" tone="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5">
          <SectionTitle title="ข้อมูลธุรกิจ & อัตราค่าใช้จ่าย" subtitle="ค่าตั้งต้นที่ใช้กับหอพักและหน้าชำระเงิน" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ค่าน้ำ (บาท/หน่วย)">
              <NumberInput value={settings.waterRate} onChange={(value) => setSettings((prev) => ({ ...prev, waterRate: value }))} />
            </Field>
            <Field label="ค่าไฟ (บาท/หน่วย)">
              <NumberInput value={settings.electricRate} onChange={(value) => setSettings((prev) => ({ ...prev, electricRate: value }))} />
            </Field>
            <Field label="ชื่อบริษัท / นิติบุคคล">
              <TextInput value={settings.companyName} onChange={(value) => setSettings((prev) => ({ ...prev, companyName: value }))} />
            </Field>
            <Field label="เลขประจำตัวผู้เสียภาษี">
              <TextInput value={settings.taxId} onChange={(value) => setSettings((prev) => ({ ...prev, taxId: value }))} />
            </Field>
            <Field label="PromptPay / เลขรับเงิน">
              <TextInput value={settings.promptPayId} onChange={(value) => setSettings((prev) => ({ ...prev, promptPayId: value }))} />
            </Field>
            <Field label="ชื่อช่องทาง LINE OA">
              <TextInput value={settings.lineChannelName} onChange={(value) => setSettings((prev) => ({ ...prev, lineChannelName: value }))} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5">
          <SectionTitle title="ช่องทางสื่อสารและแจ้งเตือน" subtitle="การเชื่อมต่อที่ roadmap ต้องมี" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {integrationRows.map((item) => (
              <div key={item.name} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-5">{item.description}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${statusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500 leading-6">
            จุดที่ยังควรต่อยอด: webhook monitoring, template message, notification logs และสถานะการส่งแบบ realtime
          </div>
        </section>
      </div>

      {/* ========== 🏢 จัดการหน่วยธุรกิจ (Business Units) CRUD ========== */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionTitle title="🏢 จัดการหน่วยธุรกิจ (Business Units)" subtitle="เพิ่ม ลบ หรือแก้ไขหน่วยธุรกิจภายในระบบบัญชีรวม" />
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all self-start sm:self-center"
          >
            <span>➕</span> เพิ่มหน่วยธุรกิจใหม่
          </button>
        </div>

        {loadingUnits ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold animate-pulse">
            กำลังโหลดข้อมูลหน่วยธุรกิจ...
          </div>
        ) : businessUnits.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-semibold rounded-2xl border border-dashed border-slate-200">
            🏢 ยังไม่มีหน่วยธุรกิจในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black">
                  <th className="p-4 rounded-tl-2xl">ชื่อหน่วยธุรกิจ</th>
                  <th className="p-4">ประเภทธุรกิจ</th>
                  <th className="p-4 text-right rounded-tr-2xl">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {businessUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{unit.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${
                        unit.type === "dormitory" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                        unit.type === "garage" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}>
                        {unit.type === "dormitory" ? "🏢 หอพัก" :
                         unit.type === "garage" ? "🛠️ อู่ซ่อมรถ" : "🏡 บ้านเช่า"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(unit)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold transition-all"
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        onClick={() => setDeletingUnitId(unit.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold transition-all"
                      >
                        🗑️ ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4 xl:col-span-1">
          <SectionTitle title="การสำรองข้อมูล" subtitle="Backup / Restore และสถานะอัตโนมัติ" />
          <div className="space-y-3">
            <ToggleRow
              title="เปิด Auto Backup"
              description="เก็บข้อมูลสำรองประจำรอบบิล"
              enabled={autoBackupEnabled}
              onChange={setAutoBackupEnabled}
            />
            <Field label="เก็บบันทึก Audit (วัน)">
              <NumberInput value={auditRetentionDays} onChange={setAuditRetentionDays} min={7} max={3650} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={exportSettings} className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-black">
              ดาวน์โหลดไฟล์ตั้งค่า
            </button>
            <label className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-black text-center cursor-pointer">
              Restore จากไฟล์
              <input type="file" accept="application/json" className="hidden" onChange={importSettings} />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4 xl:col-span-2">
          <SectionTitle title="User / Role / Audit" subtitle="พื้นที่สำหรับขยายระบบให้ครบตาม roadmap" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              ["Users", "ยังไม่มีหน้าแอดมินจัดการผู้ใช้เต็มรูปแบบ"],
              ["Roles", "ควรกำหนดสิทธิ์ admin / staff / viewer"],
              ["Audit Log", "ควรเก็บประวัติการเปลี่ยนแปลงข้อมูล"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-800">{title}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-5">{desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="text-sm font-black text-slate-800 mb-2">Deployment / Hosting Notes</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 leading-6">
              <InfoChip label="Frontend" value="Next.js" />
              <InfoChip label="Backend" value="FastAPI" />
              <InfoChip label="Database" value="SQLite / PostgreSQL-ready" />
              <InfoChip label="Storage" value="Can evolve to R2 / Supabase" />
            </div>
          </div>
        </section>
      </div>

      {/* Modal เพิ่ม/แก้ไข หน่วยธุรกิจ */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-6 space-y-5 shadow-2xl animate-[scaleUp_0.3s_ease-out]">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {editingUnit ? "✏️ แก้ไขหน่วยธุรกิจ" : "🏢 เพิ่มหน่วยธุรกิจใหม่"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดข้อมูลสำหรับระบบบัญชีและการจัดกลุ่มข้อมูลของหน่วยธุรกิจ
              </p>
            </div>

            <form onSubmit={handleSubmitUnit} className="space-y-4">
              <Field label="ชื่อหน่วยธุรกิจ">
                <input
                  type="text"
                  required
                  placeholder="เช่น หอพักคุณป้า, อู่รถยนต์เทพ"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none font-bold text-slate-700 text-sm"
                />
              </Field>

              <Field label="ประเภทธุรกิจ">
                <select
                  value={unitForm.type}
                  onChange={(e) => setUnitForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none font-bold text-slate-700 text-sm"
                >
                  <option value="dormitory">🏢 หอพัก (Dormitory)</option>
                  <option value="garage">🛠️ อู่ซ่อมรถ (Garage)</option>
                  <option value="house">🏡 บ้านเช่า (Rental House)</option>
                </select>
              </Field>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingUnit}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-md shadow-blue-600/10"
                >
                  {isSubmittingUnit ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบหน่วยธุรกิจ */}
      {deletingUnitId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 p-6 space-y-4 shadow-2xl text-center animate-[scaleUp_0.3s_ease-out]">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">ยืนยันการลบหน่วยธุรกิจ?</h3>
              <p className="text-xs text-slate-400 mt-2 leading-5">
                การลบหน่วยธุรกิจอาจส่งผลกระทบต่อรายการบัญชีและธุรกรรมที่เชื่อมโยงกับหน่วยธุรกิจนี้ โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleDeleteUnit(deletingUnitId)}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-md shadow-rose-600/10"
              >
                ลบหน่วยธุรกิจ
              </button>
              <button
                onClick={() => setDeletingUnitId(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, suffix = "", tone }: { label: string; value: number; suffix?: string; tone: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tone}`}>
        {value.toLocaleString("th-TH")} <span className="text-xs text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-black text-slate-800">{title}</h2>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] ml-1">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none font-bold text-slate-700"
    />
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none font-bold text-slate-700 text-sm"
    />
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div>
        <div className="text-sm font-black text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500 mt-1">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`w-14 h-8 rounded-full p-1 transition flex items-center ${enabled ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"}`}
      >
        <span className="w-6 h-6 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="font-black text-slate-800 mt-1">{value}</div>
    </div>
  );
}
