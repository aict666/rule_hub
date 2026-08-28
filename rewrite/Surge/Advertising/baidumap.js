const isQuanX = typeof $task !== "undefined";
const raw = isQuanX && $response.bodyBytes ? new Uint8Array($response.bodyBytes) : $response.body;
const expiredStart = 1648746061;
const expiredEnd = 1648832461;

function toU8(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function decodeUtf8(bytes) {
  const chars = [];
  let chunk = [];
  function flush() {
    if (!chunk.length) return;
    chars.push(String.fromCharCode.apply(null, chunk));
    chunk = [];
  }
  for (let i = 0; i < bytes.length; ) {
    let c = bytes[i++];
    if (c < 0x80) {
      chunk.push(c);
    } else if (c < 0xe0 && i < bytes.length) {
      chunk.push(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (c < 0xf0 && i + 1 < bytes.length) {
      chunk.push(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    } else if (i + 2 < bytes.length) {
      c = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      c -= 0x10000;
      chunk.push(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff));
    }
    if (chunk.length >= 8192) flush();
  }
  flush();
  return chars.join("");
}

function encodeUtf8(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if ((c & 0xfc00) === 0xd800 && i + 1 < text.length) {
      const next = text.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (next & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function sanitize(node) {
  if (Array.isArray(node)) return node.map(sanitize);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (
      /splash|banner|open_?ad|adunit|ad_?list|advert|marketing|popup|launch_?ad|startup/i.test(key)
    ) {
      out[key] = Array.isArray(value) ? [] : value && typeof value === "object" ? {} : null;
    } else if (["start", "end", "stime", "etime"].includes(key) && typeof value === "number") {
      out[key] = key === "end" || key === "etime" ? expiredEnd : expiredStart;
    } else {
      out[key] = sanitize(value);
    }
  }
  return out;
}

let body = null;
try {
  const bytes = toU8(raw);
  const text = typeof raw === "string" ? raw : bytes ? decodeUtf8(bytes) : "";
  const data = JSON.parse(text.trim());
  const result = JSON.stringify(sanitize(data));
  body = typeof raw === "string" ? result : encodeUtf8(result);
} catch (e) {}

if (!body) {
  $done({});
} else if (isQuanX && body instanceof Uint8Array) {
  $done({ bodyBytes: body.buffer });
} else {
  $done({ body });
}
