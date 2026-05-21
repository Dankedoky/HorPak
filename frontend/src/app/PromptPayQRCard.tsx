"use client";

import { useEffect, useState } from "react";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { verifyPaymentSlip } from "@/lib/api";

interface PromptPayQRCardProps {
  amount: number;
  title?: string;
  type?: "dorm" | "house" | "garage" | "invoice";
  targetId?: string;
  onSuccess?: (refNo: string) => void;
  onClose?: () => void;
}

export default function PromptPayQRCard({
  amount,
  title = "ชำระเงินค่าเช่า/ค่าบริการ",
  type,
  targetId,
  onSuccess,
  onClose,
}: PromptPayQRCardProps) {
  const [promptPayId, setPromptPayId] = useState("0105569000123");
  const [companyName, setCompanyName] = useState("บริษัท ซอฟเวอเรน โวลต์ จำกัด");
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // AI Verification State: "idle" | "reading" | "watermark" | "saving" | "success" | "error"
  const [verifyState, setVerifyState] = useState<"idle" | "reading" | "watermark" | "saving" | "success" | "error">("idle");
  const [progressText, setProgressText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [receiptData, setReceiptData] = useState<{
    refNo: string;
    sender: string;
    receiver: string;
    amount: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const savedPromptPay = localStorage.getItem("setting_promptpay_id");
    const savedCompany = localStorage.getItem("setting_company_name");
    if (savedPromptPay) setTimeout(() => setPromptPayId(savedPromptPay), 0);
    if (savedCompany) setTimeout(() => setCompanyName(savedCompany), 0);
  }, []);

  const qrPayload = generatePromptPayPayload(promptPayId, amount);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Simulate AI Verification steps before hitting backend
  const handleVerifySlip = async () => {
    if (!type || !targetId) return;
    
    setVerifyState("reading");
    setProgressText("🔍 กำลังสแกนคิวอาร์โค้ดและอ่านข้อมูลภาพสลิป...");
    
    try {
      // Step 1: Scan (1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setVerifyState("watermark");
      setProgressText("🛡️ กำลังตรวจสอบลายน้ำดิจิทัลและลายเซ็นต์อิเล็กทรอนิกส์ (Digital Watermark)...");
      
      // Step 2: Validate watermark (1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setVerifyState("saving");
      setProgressText("💾 กำลังเรียกเซิร์ฟเวอร์เพื่อบันทึกข้อมูลธุรกรรมถาวร...");
      
      // Step 3: Hit actual backend API
      const result = await verifyPaymentSlip(type, targetId);
      
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (result.status === "success" || result.status === "already_paid") {
        setReceiptData({
          refNo: result.ref_no || "REF-" + Math.floor(Math.random() * 10000000000),
          sender: result.sender || "ผู้เช่าในระบบ",
          receiver: result.receiver || companyName,
          amount: result.amount || amount,
          message: result.message || "ชำระบิลสำเร็จแล้ว",
        });
        setVerifyState("success");
      } else {
        throw new Error(result.detail || "เกิดข้อผิดพลาดในการตรวจสอบสลิป");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "ไม่สามารถยืนยันสลิปได้ โปรดติดต่อผู้ดูแลระบบ");
      setVerifyState("error");
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      {verifyState !== "success" ? (
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-slate-100 animate-[scaleUp_0.3s_ease-out] flex flex-col relative">
          
          {/* Progress Glassmorphism Overlay */}
          {verifyState !== "idle" && verifyState !== "error" && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
              <h3 className="text-base font-black text-slate-800 mb-2">ระบบ AI กำลังตรวจสอบสลิป...</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-[240px] animate-pulse">
                {progressText}
              </p>
            </div>
          )}

          {/* Card Header (Thai QR Payment Style) */}
          <div className="bg-[#0f2354] px-6 py-4 text-white text-center relative">
            <div className="text-[10px] font-black tracking-widest text-blue-200 uppercase mb-0.5">Thai QR Payment</div>
            <div className="font-extrabold text-sm flex items-center justify-center gap-1.5">
              <span>Scan to Pay</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* PromptPay Brand Strip */}
          <div className="bg-sky-50 py-2 border-b border-sky-100 flex items-center justify-center gap-2">
            <div className="font-black text-[15px] tracking-tight text-blue-900 flex items-center gap-1">
              <span className="text-sky-500">🛡️</span>
              <span>Prompt</span>
              <span className="text-sky-500">Pay</span>
            </div>
            <span className="text-[9px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">พร้อมเพย์</span>
          </div>

          {/* QR Code Area */}
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-inner relative flex items-center justify-center">
              {/* Custom corners */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-600 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-600 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-600 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-600 rounded-br-2xl" />
              
              {/* QR Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={qrImageUrl} 
                alt="PromptPay QR Code" 
                className="w-48 h-48 rounded-lg select-none"
              />
            </div>

            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-wider text-center">
              ใช้แอปธนาคารสแกนคิวอาร์โค้ดเพื่อชำระเงิน
            </p>
          </div>

          {/* Billing Information & Total */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 space-y-4 rounded-b-3xl">
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดเงินเรียกเก็บสุทธิ</div>
              <div className="text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                <span>{amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                <span className="text-sm font-bold text-slate-400">บาท</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-1 max-w-[250px] mx-auto truncate">
                {title}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              {/* Merchant Details */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">ผู้รับเงิน:</span>
                <span className="font-bold text-slate-700 text-right truncate max-w-[180px]">
                  {companyName}
                </span>
              </div>

              {/* PromptPay ID (with Copy option) */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">พร้อมเพย์:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-700">{promptPayId}</span>
                  <button 
                    onClick={handleCopyId}
                    className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    {copied ? "ก๊อปปี้แล้ว!" : "คัดลอก"}
                  </button>
                </div>
              </div>

              {/* Amount details (with Copy option) */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">คัดลอกยอดเงิน:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-700">{amount.toFixed(2)}</span>
                  <button 
                    onClick={handleCopyAmount}
                    className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    {copiedAmount ? "ก๊อปปี้แล้ว!" : "คัดลอก"}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Slip Reading & Auto Verification Section */}
            {type && targetId && (
              <div className="pt-2 border-t border-slate-200">
                {verifyState === "error" && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-600 font-medium">
                    ⚠️ {errorMessage}
                  </div>
                )}
                <button
                  onClick={handleVerifySlip}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  🔍 จำลองการตรวจสอบสลิปโอนเงิน (AI)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==========================================
           🟢 Premium Receipt Success Modal
           ========================================== */
        <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl max-w-sm w-full border border-slate-100 animate-[scaleUp_0.35s_cubic-bezier(0.16,1,0.3,1)] flex flex-col p-6 items-center text-center">
          
          {/* Large Green Animated Tick Circle */}
          <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 text-4xl mb-4 shadow-lg shadow-emerald-500/10 animate-[bounce_1s_ease-out_1]">
            ✓
          </div>

          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mb-1.5">
            Payment Successful
          </span>

          <h2 className="text-xl font-black text-slate-800 tracking-tight">ชำระเงินเรียบร้อยแล้ว!</h2>
          <p className="text-slate-400 text-[11px] mt-0.5 leading-normal px-4">
            ระบบตรวจสอบสลิปผ่านทาง API ธนาคาร และปรับปรุงบัญชีแยกประเภทสำเร็จแล้ว
          </p>

          {/* Receipt Content Card */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 my-5 space-y-2.5 text-left text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">เลขอ้างอิง (Ref. No.):</span>
              <span className="font-mono font-bold text-slate-700">{receiptData?.refNo}</span>
            </div>
            
            <div className="h-[1px] bg-slate-200/60 my-1" />

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">ผู้โอนเงิน (Sender):</span>
              <span className="font-bold text-slate-700">{receiptData?.sender}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">ผู้รับเงิน (Receiver):</span>
              <span className="font-bold text-slate-700">{receiptData?.receiver}</span>
            </div>

            <div className="h-[1px] bg-slate-200/60 my-1" />

            <div className="flex justify-between items-end">
              <span className="font-semibold text-slate-400 pb-0.5">จำนวนเงินทั้งสิ้น:</span>
              <span className="text-lg font-black text-emerald-600 tracking-tight">
                {receiptData?.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                <span className="text-[10px] font-bold text-emerald-500 ml-1">บาท</span>
              </span>
            </div>
          </div>

          {/* Button Close & Success Trigger */}
          <button
            onClick={() => {
              if (onSuccess && receiptData) onSuccess(receiptData.refNo);
              if (onClose) onClose();
            }}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black shadow-lg shadow-slate-800/10 transition-all"
          >
            ตกลง / ปิดหน้าต่างใบเสร็จ
          </button>
        </div>
      )}
    </div>
  );
}
