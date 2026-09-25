/**
 * Browser file I/O primitives for backup export/import (APP_TECH_ARCHITECTURE_V0.md
 * §10.9: "Export through the share sheet (iCloud Drive, Files, AirDrop); download on
 * desktop"). Pure browser API glue — no contracts/app knowledge (platform -> domain
 * only, tests/architecture.test.ts): callers pass already-serialized JSON text in, and
 * get already-read JSON text back out.
 */

export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/** Minimal shape of the Web Share API's file-sharing extension (Level 2) — not always
 * present in the TS DOM lib bundled with this project's TypeScript version, so declared
 * locally rather than widening `navigator` to `any` everywhere below. */
interface NavigatorFileShare {
  share(data: { files: File[]; title?: string }): Promise<void>;
  canShare(data: { files: File[] }): boolean;
}

function shareCapableNavigator(): NavigatorFileShare | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as Partial<NavigatorFileShare>;
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') return nav as NavigatorFileShare;
  return null;
}

function downloadBlob(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves `json` as a file named `filename`. Prefers the OS share sheet (so the backup
 * can go straight to iCloud Drive/Files/AirDrop on iOS); falls back to a plain download
 * when the Share API isn't available (desktop) or can't share files. A user-cancelled
 * share sheet is reported as 'cancelled', not silently followed by a download the user
 * didn't ask for. */
export async function saveJsonFile(filename: string, json: string): Promise<SaveResult> {
  const shareNav = shareCapableNavigator();
  if (shareNav) {
    const file = new File([json], filename, { type: 'application/json' });
    if (shareNav.canShare({ files: [file] })) {
      try {
        await shareNav.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        // any other share failure falls through to a plain download below
      }
    }
  }
  downloadBlob(filename, json);
  return 'downloaded';
}

/** Opens the OS file picker and resolves with the selected file's text content.
 * Rejects if the user closes the picker without choosing a file or the file can't be
 * read as text. */
export function pickJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    let settled = false;
    // Most browsers fire no event at all when the picker is dismissed with nothing
    // chosen; `focus` returning to the window shortly after is the closest general
    // signal, so a cancel without a file selection eventually rejects instead of
    // hanging the caller's await forever.
    const onWindowFocus = () => {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener('focus', onWindowFocus);
          document.body.removeChild(input);
          reject(new Error('No file selected.'));
        }
      }, 300);
    };
    window.addEventListener('focus', onWindowFocus);

    input.onchange = () => {
      const file = input.files?.[0];
      window.removeEventListener('focus', onWindowFocus);
      if (!file) {
        settled = true;
        document.body.removeChild(input);
        reject(new Error('No file selected.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        settled = true;
        document.body.removeChild(input);
        resolve(String(reader.result ?? ''));
      };
      reader.onerror = () => {
        settled = true;
        document.body.removeChild(input);
        reject(reader.error ?? new Error('Could not read the selected file.'));
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
  });
}
