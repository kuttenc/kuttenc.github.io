(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OpeixeiroWhatsAppHistory = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const MESSAGE_HEADER_PATTERNS = [
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s?(.*)$/i,
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*-\s*([^:]+):\s?(.*)$/i,
  ];
  const QUANTITY = String.raw`\d+(?:[.,]\d+)?`;
  const UNIT = String.raw`(?:kg|g|un(?:id(?:ade)?)?s?|cx|caixa|caixas|pct|pacote|pacotes|l|ml)`;

  function parseDateTime(dateValue, timeValue) {
    const dateParts = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(dateValue);
    const timeParts = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i.exec(
      timeValue.trim(),
    );
    if (!dateParts || !timeParts) return null;

    const day = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const yearValue = Number(dateParts[3]);
    const year = dateParts[3].length === 2 ? 2000 + yearValue : yearValue;
    let hour = Number(timeParts[1]);
    const minute = Number(timeParts[2]);
    const second = Number(timeParts[3] || 0);
    const meridiem = timeParts[4]?.toUpperCase();

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
      minute > 59 ||
      second > 59
    ) {
      return null;
    }
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
    } else if (hour > 23) {
      return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, second);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return {
      reportDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      sourceTimestamp: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
      messageAt: date.toISOString(),
    };
  }

  function parseHeader(line) {
    for (const pattern of MESSAGE_HEADER_PATTERNS) {
      const match = pattern.exec(line);
      if (!match) continue;
      const parsedDate = parseDateTime(match[1], match[2]);
      if (!parsedDate) return null;
      return {
        ...parsedDate,
        senderName: match[3].trim(),
        firstLine: match[4],
      };
    }
    return null;
  }

  function parseWhatsAppExport(value) {
    const messages = [];
    let current = null;
    const flush = () => {
      if (!current) return;
      current.messageText = current.parts.join("\n").trim();
      delete current.parts;
      messages.push(current);
      current = null;
    };

    for (const line of String(value ?? "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const header = parseHeader(line);
      if (header) {
        flush();
        current = {
          reportDate: header.reportDate,
          sourceTimestamp: header.sourceTimestamp,
          messageAt: header.messageAt,
          senderName: header.senderName,
          parts: [header.firstLine],
        };
        continue;
      }

      if (/^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/.test(line)) {
        flush();
        continue;
      }
      if (current) current.parts.push(line);
    }
    flush();
    return messages;
  }

  function hasQuantifiedItemLine(line) {
    const normalized = line
      .trim()
      .replace(/^[•*✅☑️–—-]\s*/, "")
      .replace(/^\d+(?:[.,]\d+)?\s*[-:]\s*/, "");
    if (!normalized || normalized.length < 3) return false;
    return (
      new RegExp(
        String.raw`^(?:${QUANTITY}\s*(?:x\s*)?(?:${UNIT}\s*)?[\p{L}][\p{L}\d\s.,()/+-]*|[\p{L}][\p{L}\d\s.,()/+-]*\s+${QUANTITY}\s*${UNIT}?|[\p{L}][\p{L}\d\s.,()/+-]*[:=]\s*${QUANTITY}(?:\s*${UNIT})?)$`,
        "iu",
      ).test(normalized) ||
      new RegExp(
        String.raw`^(?:${QUANTITY}\s*(?:x\s*)?(?:${UNIT})\s+[\p{L}][\p{L}\d\s.,()/+-]*|[\p{L}][\p{L}\d\s.,()/+-]*\s+${QUANTITY}\s*(?:${UNIT}))$`,
        "iu",
      ).test(normalized)
    );
  }

  function isIdentifiableOrder(messageText) {
    const lines = String(messageText ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const orderTerm = /\bpedidos?\b|\bsolicita[cç][aã]o\b/i;
    if (!lines.some((line) => orderTerm.test(line))) {
      return false;
    }
    return lines.some((line) => {
      if (!orderTerm.test(line)) return hasQuantifiedItemLine(line);
      return line
        .split(/[:=]|\s+[–—-]\s+/)
        .slice(1)
        .some(hasQuantifiedItemLine);
    });
  }

  async function sha256(value) {
    if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
      throw new Error("Este navegador não oferece suporte à identificação segura de duplicidades.");
    }
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  async function buildArchiveRows(messages) {
    const occurrences = new Map();
    const rows = [];
    for (const message of messages) {
      if (!isIdentifiableOrder(message.messageText)) continue;
      const stableContent = [
        message.reportDate,
        message.sourceTimestamp || message.messageAt,
        message.senderName,
        message.messageText,
      ].join("\u0000");
      const occurrence = (occurrences.get(stableContent) || 0) + 1;
      occurrences.set(stableContent, occurrence);
      const digest = await sha256(`${stableContent}\u0000${occurrence}`);
      rows.push({
        source_message_id: `history-import:${digest}`,
        report_date: message.reportDate,
        source_name: "WhatsApp — pedidos históricos importados",
        message_at: message.messageAt,
        sender_name: message.senderName || null,
        message_text: message.messageText,
        media_path: null,
        media_type: null,
        chatbot_interpretation:
          "Mensagem identificada como pedido histórico para impressão; não é um pedido operacional.",
        correction_or_learning:
          "Importado do TXT sem mídia. Não altera estoque, despacho ou pedidos operacionais.",
      });
    }
    return rows;
  }

  return {
    buildArchiveRows,
    isIdentifiableOrder,
    parseDateTime,
    parseWhatsAppExport,
  };
});
