import React, { useState } from 'react';
import { AppSettings, AspectRatioFormat, QualityTier } from '../../types';
import {
  Settings,
  Sliders,
  HardDrive,
  Save,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure default variant options and file export parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Default Parameters */}
        <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-medium text-zinc-300">
              Default Generator Values
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Default Format */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">Default Format</label>
              <select
                value={formData.defaultFormat}
                onChange={(e) =>
                  setFormData({ ...formData, defaultFormat: e.target.value as AspectRatioFormat })
                }
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                <option value="original">Original Aspect Ratio</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="1:1">1:1 Square</option>
                <option value="4:5">4:5 Portrait</option>
              </select>
            </div>

            {/* Default Quality */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">Default Quality</label>
              <select
                value={formData.defaultQuality}
                onChange={(e) =>
                  setFormData({ ...formData, defaultQuality: e.target.value as QualityTier })
                }
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                <option value="high">High (CRF 18)</option>
                <option value="medium">Medium (CRF 23)</option>
                <option value="compressed">Compressed (CRF 28)</option>
              </select>
            </div>

            {/* Default Count */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">Default Variant Count</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.defaultVariantCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultVariantCount: Math.max(1, parseInt(e.target.value) || 5),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Export Naming */}
        <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-medium text-zinc-300">
              Export Naming Pattern
            </h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 block">Filename Template</label>
            <input
              type="text"
              value={formData.exportNamingPattern}
              onChange={(e) => setFormData({ ...formData, exportNamingPattern: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
            <span className="text-[11px] text-zinc-500 block">
              Available tags: &#123;filename&#125;, &#123;variant_num&#125;, &#123;ratio&#125;
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            id="save-settings-submit-btn"
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
