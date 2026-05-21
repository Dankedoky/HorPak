/**
 * PromptPay EMVCo Payload Generator
 * Encodes PromptPay ID (phone number or Tax ID) and optional amount into a standard EMVCo QR code string.
 */
export function generatePromptPayPayload(promptpayId: string, amount?: number): string {
  // Format target ID: keep only digits
  let target = promptpayId.replace(/[^0-9]/g, "");
  
  if (target.length === 10 && target.startsWith("0")) {
    // Phone number format: prefix with 66 and remove leading 0 (e.g. 0812345678 -> 66812345678)
    target = "0066" + target.substring(1);
  }
  
  // Tag 29: PromptPay Merchant Information
  const merchantInfo = 
    "0010A000000677010111" + // AID for PromptPay
    (target.length === 13 
      ? "02" + target.length.toString().padStart(2, "0") + target // National ID / Corporate Tax ID
      : "01" + target.length.toString().padStart(2, "0") + target); // Phone Number

  let payload = 
    "000201" + // Payload Format Indicator
    "010211" + // Point of Initiation Method (11 = static, 12 = dynamic)
    "29" + merchantInfo.length.toString().padStart(2, "0") + merchantInfo +
    "5303764" + // Currency Code (764 = THB)
    "5802TH"; // Country Code (TH)

  if (amount !== undefined && amount > 0) {
    const amountStr = amount.toFixed(2);
    payload += "54" + amountStr.length.toString().padStart(2, "0") + amountStr;
  }

  // Calculate CRC16 checksum
  payload += "6304";
  const checksum = crc16(payload);
  payload += checksum;

  return payload;
}

// CRC16 Checksum for EMVCo
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
