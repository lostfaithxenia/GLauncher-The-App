// The console's wave file loader cleanly falls back when lines.qrc is absent.
import { Archive } from "./formats.js";
import { loadAssets } from "./renderer.js";

export async function fetchPs3File(name) {
  const url = `./assets/maxmb/wave/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`no ${name} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

let _files = null;
export function loadFiles() {
  if (_files) return _files;
  _files = (async () => {
    const archive = await Archive.fromBytes(await fetchPs3File("lines.qrc"));
    return { archive, assets: loadAssets(archive) };
  })();
  _files.catch(() => {
    _files = null;
  });
  return _files;
}
