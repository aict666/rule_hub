const isQuanX = typeof $task !== "undefined";
const url = $request.url;
const raw = isQuanX && $response.bodyBytes ? new Uint8Array($response.bodyBytes) : $response.body;

function toU8(b) {
  if (b == null) return null;
  if (b instanceof Uint8Array) return b;
  if (typeof ArrayBuffer !== "undefined" && b instanceof ArrayBuffer) return new Uint8Array(b);
  if (typeof b === "string") return encodeUtf8(b);
  return null;
}

function decodeUtf8(bytes, start = 0, end = bytes.length) {
  const chars = [];
  let chunk = [];
  function flush() {
    if (!chunk.length) return;
    chars.push(String.fromCharCode.apply(null, chunk));
    chunk = [];
  }
  for (let i = start; i < end; ) {
    let c = bytes[i++];
    if (c < 0x80) {
      chunk.push(c);
    } else if (c < 0xe0 && i < end) {
      chunk.push(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (c < 0xf0 && i + 1 < end) {
      chunk.push(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    } else if (i + 2 < end) {
      c = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      c -= 0x10000;
      chunk.push(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff));
    } else {
      chunk.push(0xfffd);
      break;
    }
    if (chunk.length >= 8192) flush();
  }
  flush();
  return chars.join("");
}

function encodeUtf8(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if ((c & 0xfc00) === 0xd800 && i + 1 < s.length) {
      const next = s.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (next & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function asText(b) {
  if (b == null) return "";
  if (typeof b === "string") return b;
  try {
    const bytes = toU8(b);
    return bytes ? decodeUtf8(bytes) : "";
  } catch (e) {
    return "";
  }
}

function parseBody(b) {
  const s = asText(b).trim();
  if (!s) return null;
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch (e) {}
  }
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try {
      return JSON.parse(s.slice(i, j + 1));
    } catch (e) {}
  }
  return null;
}

const splashKeys = new Set([
  "ad",
  "ads",
  "splash",
  "splash_list",
  "splashlist",
  "material",
  "materials",
  "creative",
  "creatives",
  "open_ad",
  "openad",
  "banner",
  "popup",
]);

function sanitizeSplash(obj) {
  function walk(node) {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      const lk = k.toLowerCase();
      if (splashKeys.has(lk) || lk.includes("splash")) {
        out[k] = Array.isArray(v) ? [] : v && typeof v === "object" ? {} : null;
        continue;
      }
      if ((k === "end_time" || k === "etime" || k === "end") && typeof v === "number") {
        out[k] = 1;
        continue;
      }
      if ((k === "display_time" || k === "duration") && typeof v === "number") {
        out[k] = 0;
        continue;
      }
      out[k] = walk(v);
    }
    return out;
  }
  return walk(obj);
}

function findJsonSegments(bytes) {
  const spans = [];
  let start = -1;
  let stack = [];
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (start < 0) {
      if (c === 0x7b || c === 0x5b) {
        start = i;
        stack = [c];
        quoted = false;
        escaped = false;
      }
      continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === 0x5c) escaped = true;
      else if (c === 0x22) quoted = false;
      continue;
    }
    if (c === 0x22) {
      quoted = true;
    } else if (c === 0x7b || c === 0x5b) {
      stack.push(c);
    } else if (c === 0x7d || c === 0x5d) {
      const open = stack[stack.length - 1];
      if ((open === 0x7b && c === 0x7d) || (open === 0x5b && c === 0x5d)) {
        stack.pop();
        if (!stack.length) {
          spans.push([start, i + 1]);
          start = -1;
        }
      } else {
        start = -1;
        stack = [];
      }
    }
  }
  return spans;
}

function joinBytes(parts) {
  let size = 0;
  for (const part of parts) size += part.length;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function rewriteBinarySplash(bytes) {
  const spans = findJsonSegments(bytes);
  if (!spans.length) return null;
  const parts = [];
  let cursor = 0;
  let changed = 0;
  for (const [start, end] of spans) {
    let obj = null;
    try {
      obj = JSON.parse(decodeUtf8(bytes, start, end));
    } catch (e) {}
    if (!obj || typeof obj !== "object") continue;
    parts.push(bytes.slice(cursor, start));
    parts.push(encodeUtf8(JSON.stringify(sanitizeSplash(obj))));
    cursor = end;
    changed++;
  }
  if (!changed) return null;
  parts.push(bytes.slice(cursor));
  return joinBytes(parts);
}

let body = null;

try {
  if (url.includes("alimama/splash_screen")) {
    const bytes = toU8(raw);
    if (typeof raw !== "string" && bytes) {
      body = rewriteBinarySplash(bytes);
    } else {
      const obj = parseBody(raw);
      if (obj) body = JSON.stringify(sanitizeSplash(obj));
    }
  } else {
    const obj = parseBody(raw);
    if (!obj) throw new Error("non-JSON response");
    if (url.includes("faas/amap-navigation/main-page")) {
      let changed = false;
      if (obj.data && obj.data.cardList) {
        obj.data.cardList = obj.data.cardList.filter((item) => item.dataType === "LoginCard");
        changed = true;
      }
      if (obj.data && obj.data.pull3 && obj.data.pull3.msgs) {
        obj.data.pull3.msgs = [];
        changed = true;
      }
      if (obj.data && obj.data.mapBizList) {
        obj.data.mapBizList = [];
        changed = true;
      }
      if (changed) body = JSON.stringify(obj);
    } else if (url.includes("ws/shield/frogserver/aocs")) {
      ["gd_notch_logo", "home_business_position_config", "his_input_tip"].forEach((key) => {
        if (obj.data && obj.data[key]) {
          obj.data[key] = { status: 1, version: "", value: "" };
        }
      });
      body = JSON.stringify(obj);
    } else if (url.includes("dsp/profile/index/nodefaas")) {
      let changed = false;
      if (obj.data && obj.data.tipData) {
        obj.data.tipData = undefined;
        changed = true;
      }
      if (obj.data && obj.data.cardList) {
        const keep = ["MyOrderCard", "GdRecommendCard"];
        obj.data.cardList = obj.data.cardList.filter((item) => keep.includes(item.dataType));
        changed = true;
      }
      if (changed) body = JSON.stringify(obj);
    } else if (url.includes("search/new_hotword")) {
      if (obj.data && obj.data.header_hotword) {
        obj.data.header_hotword = [];
        body = JSON.stringify(obj);
      }
    } else if (url.includes("ws/msgbox/pull")) {
      let changed = false;
      if (obj.msgs) {
        obj.msgs = [];
        changed = true;
      }
      if (obj.pull3 && obj.pull3.msgs) {
        obj.pull3.msgs = [];
        changed = true;
      }
      if (changed) body = JSON.stringify(obj);
    } else if (url.includes("ws/message/notice/list")) {
      if (obj.data && obj.data.noticeList) {
        obj.data.noticeList = [];
        body = JSON.stringify(obj);
      }
    } else if (url.includes("ws/promotion-web/resource")) {
      let changed = false;
      for (const key of ["icon", "tips", "popup", "banner"]) {
        if (obj.data && obj.data[key]) {
          obj.data[key] = undefined;
          changed = true;
        }
      }
      if (obj.data && obj.data.bubble) {
        Object.keys(obj.data.bubble).forEach((key) => {
          obj.data.bubble[key] = [];
        });
        changed = true;
      }
      if (changed) body = JSON.stringify(obj);
    } else if (url.includes("search/nearbyrec_smart")) {
      if (obj.data && obj.data.modules) {
        obj.data.modules = ["head", "search_hot_words", "feed_rec"];
        body = JSON.stringify(obj);
      }
    }
  }
} catch (e) {}

if (!body) {
  $done({});
} else if (isQuanX && body instanceof Uint8Array) {
  $done({ bodyBytes: body.buffer });
} else {
  $done({ body });
}
