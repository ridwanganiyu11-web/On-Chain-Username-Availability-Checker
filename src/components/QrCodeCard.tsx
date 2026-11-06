import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Share2, Check, Copy } from 'lucide-react';
import { buildPublicProfileUrl } from '../utils/username';

interface QrCodeCardProps {
  username: string;
  walletAddress?: string;
  compact?: boolean;
}

export const QrCodeCard: React.FC<QrCodeCardProps> = ({
  username,
  walletAddress,
  compact = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const profileUrl = buildPublicProfileUrl(username);

  useEffect(() => {
    let active = true;
    async function generate() {
      try {
        const url = await QRCode.toDataURL(profileUrl, {
          width: 360,
          margin: 2,
          color: {
            dark: '#070B14',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        });
        if (active) setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    }
    if (username) {
      generate();
    }
    return () => {
      active = false;
    };
  }, [username, profileUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    // Create a branded canvas with the QR code and @username label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 480;
      canvas.height = 560;
      if (!ctx) return;

      // Dark background
      ctx.fillStyle = '#070B14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      // Header text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOTNAME • BOTCHAIN TESTNET (968)', canvas.width / 2, 54);

      // White QR container
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(60, 80, 360, 360);
      ctx.drawImage(img, 60, 80, 360, 360);

      // Username label
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.fillText(`@${username}`, canvas.width / 2, 485);

      if (walletAddress) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px JetBrains Mono, monospace';
        ctx.fillText(
          `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`,
          canvas.width / 2,
          518
        );
      }

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `botname-${username}-qr.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = qrDataUrl;
  };

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} on BotName (Botchain)`,
          text: `Check out @${username}'s Web3 identity on Botchain Testnet!`,
          url: profileUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyProfileLink();
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
        <QrCode className="w-4 h-4" />
        <span>QR Code Identity Sharing</span>
      </div>

      <div className="bg-white p-3.5 rounded-2xl shadow-lg shadow-emerald-950/40 border-2 border-emerald-500/30 mb-4">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code for @${username}`}
            className={compact ? 'w-36 h-36' : 'w-44 h-44'}
          />
        ) : (
          <div
            className={`${
              compact ? 'w-36 h-36' : 'w-44 h-44'
            } flex items-center justify-center text-slate-400 text-xs`}
          >
            Generating QR...
          </div>
        )}
      </div>

      <div className="font-mono font-bold text-lg text-white mb-1">@{username}</div>
      <p className="text-xs text-slate-400 mb-4 max-w-xs break-all font-mono">{profileUrl}</p>

      <div className="grid grid-cols-2 gap-2.5 w-full">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={!qrDataUrl}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>

        <button
          type="button"
          onClick={handleCopyProfileLink}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs border border-slate-700 transition cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied URL</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={handleNativeShare}
        className="mt-2.5 w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 text-slate-300 text-xs border border-slate-800 transition cursor-pointer"
      >
        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Share Identity Profile</span>
      </button>
    </div>
  );
};

