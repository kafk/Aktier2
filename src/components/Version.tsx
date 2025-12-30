"use client";

// App version - update this when releasing new versions
export const APP_VERSION = "1.0.0";

export function Version() {
  return (
    <div className="fixed bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded shadow-sm">
      v{APP_VERSION}
    </div>
  );
}
