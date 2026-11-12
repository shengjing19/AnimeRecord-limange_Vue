/** 按 Blob 字节数和条目数限制缓存；正在显示的条目不回收，释放后再收敛到预算。 */
export class CoverCache {
  constructor(maxBytes, dispose, maxEntries = 256) {
    this.maxBytes = maxBytes;
    this.dispose = dispose;
    this.entries = new Map();
    this.bytes = 0;
    this.maxEntries = maxEntries;
  }

  acquire(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    this.entries.delete(key);
    this.entries.set(key, entry);
    entry.users++;
    let released = false;
    return {
      url: entry.url,
      release: () => {
        if (released) return;
        released = true;
        entry.users--;
        this.trim();
      }
    };
  }

  put(key, value) {
    if (this.entries.has(key)) return;
    const entry = { ...value, users: 0 };
    this.entries.set(key, entry);
    this.bytes += entry.bytes;
    // 调用方先 acquire 再 trim，避免单张图片超过预算时 URL 尚未使用就失效。
  }

  trim() {
    for (const [key, entry] of this.entries) {
      if (this.bytes <= this.maxBytes && this.entries.size <= this.maxEntries) break;
      if (entry.users) continue;
      this.entries.delete(key);
      this.bytes -= entry.bytes;
      this.dispose(entry.url);
    }
  }
}
