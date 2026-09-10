const WARM_CONCURRENCY = 6;

export class ImagePreloader {
  private readonly loaded = new Map<string, Promise<void>>();
  private readonly held = new Map<string, HTMLImageElement>();

  warm(urls: readonly string[]): void {
    void this.runLimited(urls);
  }

  ready(urls: readonly string[], timeoutMs = 5000): Promise<void> {
    const all = Promise.all(urls.map((url) => this.load(url))).then(() => undefined);
    const timeout = new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    });
    return Promise.race([all, timeout]).catch(() => undefined);
  }

  private async runLimited(urls: readonly string[]): Promise<void> {
    const queue = [...urls];
    const workers = Array.from({ length: Math.min(WARM_CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (url === undefined) break;
        await this.load(url).catch(() => {});
      }
    });
    await Promise.all(workers);
  }

  private load(url: string): Promise<void> {
    const cached = this.loaded.get(url);
    if (cached) return cached;

    const img = new Image();
    this.held.set(url, img);
    img.decoding = "async";
    const promise = new Promise<void>((resolve) => {
      const settle = () => resolve();
      img.src = url;
      img.decode().then(settle).catch(() => {
        img.addEventListener("load", settle, { once: true });
        img.addEventListener("error", settle, { once: true });
      });
    });
    this.loaded.set(url, promise);
    return promise;
  }
}

export const imagePreloader = new ImagePreloader();
