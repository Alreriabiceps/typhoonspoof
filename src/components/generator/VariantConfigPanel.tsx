import React, { useState } from 'react';
import {
  VariantConfig,
  AspectRatioFormat,
  QualityTier,
  VariationMode,
  PresetCategory,
  VideoAdjustments,
} from '../../types';
import { PRESETS, DEFAULT_ADJUSTMENTS } from '../../data/presets';
import {
  Sliders,
  Sparkles,
  Shuffle,
  Smartphone,
  Square,
  Monitor,
  RotateCcw,
  Type,
  Shield,
  Play,
} from 'lucide-react';

interface VariantConfigPanelProps {
  config: VariantConfig;
  onChangeConfig: (newConfig: VariantConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const VariantConfigPanel: React.FC<VariantConfigPanelProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  isGenerating,
}) => {
  const [activeTab, setActiveTab] = useState<'adjustments' | 'overlays'>('adjustments');

  const updateAdjustments = (key: keyof VideoAdjustments, val: any) => {
    onChangeConfig({
      ...config,
      adjustments: {
        ...config.adjustments,
        [key]: val,
      },
    });
  };

  const handleModeChange = (mode: VariationMode) => {
    onChangeConfig({
      ...config,
      mode,
    });
  };

  const handleApplyPreset = (presetId: PresetCategory) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset && preset.config) {
      onChangeConfig({
        ...config,
        mode: 'preset',
        preset: presetId,
        format: preset.config.format || config.format,
        quality: preset.config.quality || config.quality,
        variantCount: preset.config.variantCount || config.variantCount,
        adjustments: preset.config.adjustments
          ? { ...config.adjustments, ...preset.config.adjustments }
          : config.adjustments,
        optionalElements: preset.config.optionalElements
          ? { ...config.optionalElements, ...preset.config.optionalElements }
          : config.optionalElements,
      });
    }
  };

  const handleResetAdjustments = () => {
    onChangeConfig({
      ...config,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    });
  };

  const countPresets = [5, 10, 20, 30, 50];

  const aspectRatios: { id: AspectRatioFormat; label: string; icon: React.ElementType }[] = [
    { id: '16:9', label: '16:9 Landscape', icon: Monitor },
    { id: '9:16', label: '9:16 Vertical', icon: Smartphone },
    { id: '1:1', label: '1:1 Square', icon: Square },
    { id: '4:5', label: '4:5 Portrait', icon: Smartphone },
    { id: 'original', label: 'Original Ratio', icon: Monitor },
  ];

  return (
    <div id="variant-config-panel" className="space-y-5">
      {/* Mode Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-400" />
          <span>Variant Configuration</span>
        </h3>

        <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <button
            id="mode-manual-btn"
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              config.mode === 'manual'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Manual
          </button>
          <button
            id="mode-randomized-btn"
            onClick={() => handleModeChange('randomized')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors ${
              config.mode === 'randomized'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shuffle className="w-3 h-3 text-zinc-400" />
            <span>Randomized</span>
          </button>
          <button
            id="mode-preset-btn"
            onClick={() => handleModeChange('preset')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors ${
              config.mode === 'preset'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-zinc-400" />
            <span>Presets</span>
          </button>
        </div>
      </div>

      {/* Preset Picker if preset mode */}
      {config.mode === 'preset' && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-400">Select Workflow Preset:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PRESETS.map((p) => {
              const isSelected = config.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-800/90 border-zinc-500'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200">{p.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Count & Format & Quality Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        {/* Number of Variants */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-zinc-300">Number of Variants</label>
            <span className="font-mono text-zinc-200">{config.variantCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={50}
              value={config.variantCount}
              onChange={(e) =>
                onChangeConfig({ ...config, variantCount: parseInt(e.target.value) || 5 })
              }
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={config.variantCount}
              onChange={(e) =>
                onChangeConfig({ ...config, variantCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })
              }
              className="w-14 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs font-mono text-center text-zinc-100"
            />
          </div>

          <div className="flex items-center gap-1 pt-1">
            {countPresets.map((cnt) => (
              <button
                key={cnt}
                onClick={() => onChangeConfig({ ...config, variantCount: cnt })}
                className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors ${
                  config.variantCount === cnt
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">Target Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-1.5">
            {aspectRatios.slice(0, 4).map((ar) => (
              <button
                key={ar.id}
                onClick={() => onChangeConfig({ ...config, format: ar.id })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  config.format === ar.id
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <ar.icon className="w-3.5 h-3.5" />
                <span className="truncate">{ar.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Tier */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">Encoding Quality</label>
          <div className="space-y-1">
            {(['high', 'medium', 'compressed'] as QualityTier[]).map((q) => (
              <button
                key={q}
                onClick={() => onChangeConfig({ ...config, quality: q })}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                  config.quality === q
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 font-medium'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="capitalize">{q} Quality</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {q === 'high' ? 'CRF 18' : q === 'medium' ? 'CRF 23' : 'CRF 28'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Adjustments & Overlays Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`text-xs font-medium pb-1 transition-colors ${
                activeTab === 'adjustments'
                  ? 'text-zinc-100 border-b-2 border-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Video Adjustments
            </button>
            <button
              onClick={() => setActiveTab('overlays')}
              className={`text-xs font-medium pb-1 transition-colors ${
                activeTab === 'overlays'
                  ? 'text-zinc-100 border-b-2 border-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Overlays & Watermark
            </button>
          </div>

          {activeTab === 'adjustments' && (
            <button
              onClick={handleResetAdjustments}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {activeTab === 'adjustments' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            {/* Brightness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Brightness</span>
                <span className="font-mono text-zinc-200">{config.adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={config.adjustments.brightness}
                onChange={(e) => updateAdjustments('brightness', parseInt(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Contrast</span>
                <span className="font-mono text-zinc-200">{config.adjustments.contrast}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={config.adjustments.contrast}
                onChange={(e) => updateAdjustments('contrast', parseFloat(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Saturation</span>
                <span className="font-mono text-zinc-200">{config.adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={config.adjustments.saturation}
                onChange={(e) => updateAdjustments('saturation', parseInt(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Color Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Color Temp</span>
                <span className="font-mono text-zinc-200">{config.adjustments.colorTemperature}</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={config.adjustments.colorTemperature}
                onChange={(e) => updateAdjustments('colorTemperature', parseInt(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Rotation</span>
                <span className="font-mono text-zinc-200">{config.adjustments.rotation}°</span>
              </div>
              <input
                type="range"
                min={-10}
                max={10}
                step={0.5}
                value={config.adjustments.rotation}
                onChange={(e) => updateAdjustments('rotation', parseFloat(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Playback Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Speed</span>
                <span className="font-mono text-zinc-200">{config.adjustments.playbackSpeed}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={config.adjustments.playbackSpeed}
                onChange={(e) => updateAdjustments('playbackSpeed', parseFloat(e.target.value))}
                className="w-full accent-zinc-200"
              />
            </div>

            {/* Horizontal Flip Toggle */}
            <div className="col-span-full pt-2 flex items-center justify-between border-t border-zinc-800">
              <span className="text-xs text-zinc-300">Horizontal Mirror Flip</span>
              <button
                onClick={() => updateAdjustments('horizontalFlip', !config.adjustments.horizontalFlip)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  config.adjustments.horizontalFlip ? 'bg-zinc-100' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-transform ${
                    config.adjustments.horizontalFlip
                      ? 'right-0.5 bg-zinc-950'
                      : 'left-0.5 bg-zinc-400'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          /* Overlays Tab */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            {/* Text Overlay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-zinc-400" /> Text Overlay
                </span>
                <input
                  type="checkbox"
                  checked={config.optionalElements.textOverlay.enabled}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      optionalElements: {
                        ...config.optionalElements,
                        textOverlay: {
                          ...config.optionalElements.textOverlay,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="accent-zinc-100"
                />
              </div>

              {config.optionalElements.textOverlay.enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Overlay text..."
                    value={config.optionalElements.textOverlay.text}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        optionalElements: {
                          ...config.optionalElements,
                          textOverlay: {
                            ...config.optionalElements.textOverlay,
                            text: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
                  />
                  <div className="flex gap-1.5">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() =>
                          onChangeConfig({
                            ...config,
                            optionalElements: {
                              ...config.optionalElements,
                              textOverlay: {
                                ...config.optionalElements.textOverlay,
                                position: pos,
                              },
                            },
                          })
                        }
                        className={`flex-1 py-1 rounded text-[11px] capitalize ${
                          config.optionalElements.textOverlay.position === pos
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'bg-zinc-950 text-zinc-500'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Watermark */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-400" /> Watermark
                </span>
                <input
                  type="checkbox"
                  checked={config.optionalElements.watermark.enabled}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      optionalElements: {
                        ...config.optionalElements,
                        watermark: {
                          ...config.optionalElements.watermark,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="accent-zinc-100"
                />
              </div>

              {config.optionalElements.watermark.enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="@handle or text..."
                    value={config.optionalElements.watermark.text}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        optionalElements: {
                          ...config.optionalElements,
                          watermark: {
                            ...config.optionalElements.watermark,
                            text: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
                  />
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Opacity: {config.optionalElements.watermark.opacity}%</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={config.optionalElements.watermark.opacity}
                      onChange={(e) =>
                        onChangeConfig({
                          ...config,
                          optionalElements: {
                            ...config.optionalElements,
                            watermark: {
                              ...config.optionalElements.watermark,
                              opacity: parseInt(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-24 accent-zinc-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Generate Button */}
      <div className="pt-2">
        <button
          id="generate-variants-btn"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-zinc-900" />
          <span>
            {isGenerating
              ? 'Generating...'
              : `Generate ${config.variantCount} Variants (${config.format})`}
          </span>
        </button>
      </div>
    </div>
  );
};
