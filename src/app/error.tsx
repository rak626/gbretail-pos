"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message || "Unknown error"}</p>
      <button onClick={reset} className="mt-2 px-4 py-2 border rounded">
        Try again
      </button>
    </div>
  );
}
