import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Apple } from 'lucide-react';
import { MobileInstallGuideModal } from './MobileInstallGuideModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'subtle' | 'compact';
  forceShow?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
  forceShow = false,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [modalTab, setModalTab] = useState<'ios' | 'android' | 'share'>('ios');

  // If already running as an installed PWA, hide unless forceShow
  if (isInstalled && !forceShow) {
    return null;
  }

  const handleInstallClick = () => {
    if (isIOS) {
      setModalTab('ios');
      setShowGuideModal(true);
    } else if (isInstallable) {
      install().then((success) => {
        if (!success) {
          setModalTab('android');
          setShowGuideModal(true);
        }
      });
    } else {
      setModalTab(isAndroid ? 'android' : 'share');
      setShowGuideModal(true);
    }
  };

  const getButtonStyles = () => {
    if (variant === 'compact') {
      return 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition shadow-xs';
    }
    if (variant === 'subtle') {
      return 'flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs';
    }
    return 'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 transition shadow-xs';
  };

  const getLabel = () => {
    if (isIOS) return 'نصب در آیفون / آیپد';
    if (isInstallable) return 'نصب مستقیم برنامه';
    if (isAndroid) return 'نصب در اندروید';
    return 'نصب اپلیکیشن موبایل';
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        title="نصب نسخه پیشرو کارگاه (PWA) روی گوشی یا تبلت"
        className={`${getButtonStyles()} ${className}`}
      >
        {isIOS ? (
          <Apple className="w-3.5 h-3.5 text-current shrink-0" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 text-current shrink-0" />
        )}
        <span>{getLabel()}</span>
        <Download className="w-3 h-3 text-current opacity-70 shrink-0" />
      </button>

      {/* Interactive Mobile Installation & Personnel Deployment Guide Modal */}
      <MobileInstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        defaultTab={modalTab}
      />
    </>
  );
};
