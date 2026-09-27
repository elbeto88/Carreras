import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Github, ExternalLink, X, FolderArchive, Sparkles } from 'lucide-react';

interface DownloadRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadRepoModal({ isOpen, onClose }: DownloadRepoModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const gitCommands = [
    'git init',
    'git add .',
    'git commit -m "feat: Videojuego de carreras 3D multijugador con saltos y disparos"',
    'git branch -M main',
    'git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git',
    'git push -u origin main',
  ];

  const fullGitScript = gitCommands.join('\n');

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = () => {
    // Download via direct anchor click
    const link = document.createElement('a');
    link.href = '/api/download-zip';
    link.setAttribute('download', 'carreras-3d-multijugador.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 text-white shadow-2xl shadow-cyan-950/60 custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-racing font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400">
              DESCARGAR CÓDIGO FUENTE
            </h2>
            <p className="text-xs text-slate-400">
              Listo para subir a GitHub, GitLab o ejecutar en tu computadora
            </p>
          </div>
        </div>

        {/* Download Action Banner */}
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Proyecto Completo Comprimido</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Incluye código React + Three.js, Servidor WebSockets, Audio, 3D Assets y README.md
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/80 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>DESCARGAR ZIP</span>
          </button>
        </div>

        {/* Steps to upload to GitHub */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-racing font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5 mb-2">
              <Github className="w-4 h-4 text-cyan-300" />
              <span>Pasos para subir a tu repositorio (GitHub / GitLab)</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-slate-200">Descomprime el archivo ZIP descargado</p>
                  <p className="text-[11px] text-slate-400">Extrae el contenido de <code className="text-cyan-300">carreras-3d-multijugador.zip</code> en una carpeta de tu equipo.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-slate-200">Crea un repositorio vacío en GitHub</p>
                  <p className="text-[11px] text-slate-400">Entra a github.com &gt; New Repository (sin marcar la casilla de README inicial).</p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-slate-200">Ejecuta estos comandos en tu terminal:</p>
                    <button
                      onClick={() => copyToClipboard(fullGitScript, 99)}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800"
                    >
                      {copiedIndex === 99 ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar todo</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800 space-y-1">
                    {gitCommands.map((cmd, idx) => (
                      <div key={idx} className="flex items-center justify-between group">
                        <span className="truncate mr-2">
                          <span className="text-emerald-400 select-none mr-1.5">$</span>
                          {cmd}
                        </span>
                        <button
                          onClick={() => copyToClipboard(cmd, idx)}
                          className="opacity-60 group-hover:opacity-100 hover:text-cyan-300 p-0.5 transition-opacity shrink-0"
                          title="Copiar línea"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Local Run Instructions */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-racing font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 mb-2">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Cómo probarlo en local después de descargarlo</span>
            </h3>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-emerald-400">$</span> npm install && npm run dev
              </div>
              <button
                onClick={() => copyToClipboard('npm install && npm run dev', 101)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {copiedIndex === 101 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-racing font-bold text-xs tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
}
