import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Instalar RTT Check no Celular"
        className="flex items-center gap-1.5 rounded-full bg-[#8b0000]/10 px-3 py-1.5 text-xs font-bold text-[#8b0000] hover:bg-[#8b0000]/20 transition"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#8b0000]/10 px-3 py-1.5 text-xs font-bold text-[#8b0000] hover:bg-[#8b0000]/20 transition"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Instalar no iPhone / iPad</h3>
              <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari (ícone de quadrado com seta para cima).<br /><br />
                2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-100 py-3 text-[15px] font-bold text-slate-700 hover:bg-slate-200"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
