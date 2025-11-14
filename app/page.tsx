"use client";

import { type ChangeEventHandler, type DragEventHandler, useCallback, useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogue, setDialogue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;

    const fileArray = Array.from(incoming);
    setFiles((prev) => {
      const names = new Set(prev.map((file) => file.name + file.lastModified));
      const newFiles = fileArray.filter((file) => !names.has(file.name + file.lastModified));
      return [...prev, ...newFiles];
    });
  }, []);

  const onDrop: DragEventHandler<HTMLLabelElement> = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver: DragEventHandler<HTMLLabelElement> = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave: DragEventHandler<HTMLLabelElement> = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const generatePodcast = useCallback(async () => {
    if (files.length === 0 || isGenerating) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    setIsGenerating(true);
    setError(null);
    setDialogue("");

    try {
      const response = await fetch("/api/generate-podcast", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { error: message } = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(message || "Error al generar el podcast");
      }

      const payload = (await response.json()) as { dialogue?: string };

      if (!payload.dialogue) {
        throw new Error("La respuesta no contiene el diálogo del podcast");
      }

      setDialogue(payload.dialogue);
    } catch (cause) {
      console.error(cause);
      const message = cause instanceof Error ? cause.message : "Error al generar el podcast";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [files, isGenerating]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 shadow-2xl shadow-black/40 backdrop-blur">
          <header className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-purple-300">PodcastGen</p>
            <h1 className="mt-4 text-4xl font-semibold text-zinc-50">Genera tu podcast en minutos</h1>
            <p className="mt-3 text-sm text-zinc-400">
              Sube tus guiones o capítulos en formato de texto y comienza a producir tu próximo podcast.
            </p>
          </header>

          <label
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              isDragging ? "border-purple-400 bg-purple-500/10" : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <input type="file" multiple onChange={onInputChange} className="hidden" />
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wider text-purple-200">
              Arrastra y suelta tus archivos
            </span>
            <span className="mt-4 text-xl font-semibold text-zinc-100">o haz clic para seleccionarlos</span>
            <span className="mt-2 text-sm text-zinc-400">Formato soportado: cualquier archivo de texto o audio.</span>
          </label>

          <section className="mt-8 space-y-3">
            {files.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">Aún no has añadido archivos.</p>
            ) : (
              <ul className="space-y-3">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-100">{file.name}</span>
                      <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300 transition hover:bg-red-500 hover:text-white"
                      aria-label={`Eliminar ${file.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            type="button"
            onClick={generatePodcast}
            disabled={isGenerating || files.length === 0}
            className="mt-10 w-full rounded-2xl bg-purple-500 py-4 text-center text-lg font-semibold text-white transition hover:bg-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isGenerating ? "Generando podcast..." : "Generar Podcast"}
          </button>

          {(error || dialogue) && (
            <section className="mt-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-zinc-100">Diálogo generado</h2>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">{dialogue}</p>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
