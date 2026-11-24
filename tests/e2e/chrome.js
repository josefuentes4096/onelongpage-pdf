// Minimal helpers to drive a real headless Chrome over the DevTools protocol,
// with no third-party dependencies (Node >= 22, or Node 20 with --experimental-websocket).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { runInPage } from '../../extension/background/debugger-session.js';

const STARTUP_TIMEOUT_MS = 20_000;
const LOAD_TIMEOUT_MS = 15_000;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findChrome() {
  const path = process.env.CHROME_PATH ?? CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!path) throw new Error('Chrome not found. Set CHROME_PATH to the Chrome executable.');
  return path;
}

class CdpConnection {
  #ws;
  #nextId = 0;
  /** @type {Map<number, { resolve: (v: any) => void, reject: (e: Error) => void }>} */
  #pending = new Map();

  /** @param {WebSocket} ws */
  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      const pending = message.id !== undefined && this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result);
    });
    // If Chrome exits or crashes, fail pending commands instead of hanging the test run.
    ws.addEventListener('close', () => {
      for (const { reject } of this.#pending.values()) reject(new Error('DevTools connection closed'));
      this.#pending.clear();
    });
  }

  send(method, params = {}, sessionId = undefined) {
    if (this.#ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`DevTools connection is not open (${method})`));
    }
    const id = ++this.#nextId;
    const response = new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
    this.#ws.send(JSON.stringify({ id, method, params, sessionId }));
    return response;
  }

  close() {
    this.#ws.close();
  }
}

/** Launches headless Chrome with a throwaway profile. */
export async function launchChrome() {
  if (typeof WebSocket === 'undefined') {
    throw new Error('WebSocket is not available: use Node >= 22 or run with --experimental-websocket.');
  }
  const userDataDir = await mkdtemp(join(tmpdir(), 'onelongpage-e2e-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1280,800',
    'about:blank',
  ];
  if (process.env.CI) args.unshift('--no-sandbox');
  const proc = spawn(findChrome(), args, { stdio: 'ignore' });
  const exited = new Promise((resolve) => proc.once('exit', resolve));

  // Chrome writes the chosen port and browser endpoint to DevToolsActivePort.
  const portFile = join(userDataDir, 'DevToolsActivePort');
  let endpoint;
  for (const deadline = Date.now() + STARTUP_TIMEOUT_MS; Date.now() < deadline; await sleep(100)) {
    try {
      const [port, path] = (await readFile(portFile, 'utf8')).trim().split('\n');
      if (port && path) {
        endpoint = `ws://127.0.0.1:${port}${path}`;
        break;
      }
    } catch {
      // Not written yet.
    }
  }
  if (!endpoint) {
    proc.kill();
    throw new Error('Chrome did not start in time.');
  }

  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const browser = new CdpConnection(ws);

  return {
    browser,
    async close() {
      browser.close();
      proc.kill();
      await exited;
      await rm(userDataDir, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
    },
  };
}

/**
 * Opens `url` in a new tab and returns a session implementing `CdpSession`
 * (the same interface the extension's capture flow uses).
 *
 * @param {CdpConnection} browser
 * @param {string} url
 */
export async function openPage(browser, url) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  const session = {
    send,
    run: (fn, ...args) => runInPage(send, fn, args),
    close: () => browser.send('Target.closeTarget', { targetId }),
  };

  await send('Page.navigate', { url });
  for (const deadline = Date.now() + LOAD_TIMEOUT_MS; ; await sleep(50)) {
    const state = await session.run(() => document.readyState).catch(() => 'loading');
    if (state === 'complete') break;
    if (Date.now() > deadline) throw new Error(`Timed out loading ${url}`);
  }
  return session;
}

const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

/**
 * Serves a directory over HTTP on a random local port (iframes need a real
 * same-origin URL; file:// pages are treated as cross-origin).
 *
 * @param {string} root
 */
export async function serveDirectory(root) {
  const server = createServer(async (req, res) => {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!path.startsWith(normalize(root))) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
