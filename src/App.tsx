import React, { useState, useRef } from 'react';
import {
  SourceVideo,
  VariantConfig,
  GeneratedVariant,
  GenerationJob,
  ToastMessage,
} from './types';
import { DEFAULT_ADJUSTMENTS, DEFAULT_METADATA_TEMPLATE, DEFAULT_OPTIONAL_ELEMENTS } from './data/presets';
import { buildInitialVariants } from './utils/buildVariants';
import { applyMetadataSpoof, buildVariantMetadata } from './utils/metadataSpoof';
import {
  generateFFmpegArgs,
  generateFFmpegArgsWithoutAudio,
  generateFFmpegCommand,
  generateMinimalWasmArgs,
} from './utils/ffmpegGenerator';
import {
  deleteInputFile,
  encodeToBlob,
  getFFmpeg,
  recoverEncoder,
  terminateFFmpeg,
  writeInputFile,
} from './utils/ffmpegClient';
import { formatBytes } from './utils/format';

import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { UploadSection } from './components/generator/UploadSection';
import { VariantConfigPanel } from './components/generator/VariantConfigPanel';
import { GenerationProgress } from './components/generator/GenerationProgress';
import { ResultsGrid } from './components/generator/ResultsGrid';
import { VariantPreviewModal } from './components/generator/VariantPreviewModal';

import JSZip from 'jszip';
import confetti from 'canvas-confetti';

function revokeIfBlob(url?: string) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function inputFilenameFor(source: SourceVideo) {
  const ext = source.name.match(/\.(mp4|webm|mov|mkv|m4v)$/i)?.[0].toLowerCase() || '.mp4';
  return `input${ext}`;
}

export default function App() {
  const [generatorStep, setGeneratorStep] = useState<'config' | 'generating' | 'results'>('config');
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  const [variantConfig, setVariantConfig] = useState<VariantConfig>({
    variantCount: 5,
    mode: 'randomized',
    format: '9:16',
    quality: 'high',
    adjustments: DEFAULT_ADJUSTMENTS,
    optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
    metadataTemplate: DEFAULT_METADATA_TEMPLATE,
  });

  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [previewingVariant, setPreviewingVariant] = useState<GeneratedVariant | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const runtimeRef = useRef<{
    paused: boolean;
    cancelled: boolean;
  }>({ paused: false, cancelled: false });

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const revokeVariantMedia = (variants: GeneratedVariant[], keepSourceUrl?: string) => {
    for (const variant of variants) {
      if (variant.videoUrl && variant.videoUrl !== keepSourceUrl) {
        revokeIfBlob(variant.videoUrl);
      }
    }
  };

  const replaceSourceVideo = (video: SourceVideo | null) => {
    setSourceVideo((prev) => {
      if (prev && prev.url !== video?.url) {
        revokeIfBlob(prev.url);
      }
      return video;
    });
  };

  const handleStartGeneration = async () => {
    if (!sourceVideo) {
      addToast('warning', 'No Video Selected', 'Please select or upload a video first.');
      return;
    }

    revokeVariantMedia(generatedVariants, sourceVideo.url);
    setGeneratedVariants([]);
    setPreviewingVariant(null);

    const count = variantConfig.variantCount;
    const initialVariants: GeneratedVariant[] = buildInitialVariants(sourceVideo, variantConfig).map(
      (variant, index) => ({
        ...variant,
        status: 'queued',
        progress: 0,
        currentStage: index === 0 ? 'Loading encoder' : 'Queued',
      })
    );

    const newJob: GenerationJob = {
      id: `job-${Date.now()}`,
      projectId: `proj-${Date.now()}`,
      projectName: `${sourceVideo.name.replace(/\.[^/.]+$/, '')} Variants`,
      sourceVideo,
      variantCount: count,
      mode: variantConfig.mode,
      status: 'generating',
      progress: 1,
      activeVariantIndex: 0,
      variants: initialVariants,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    runtimeRef.current = { paused: false, cancelled: false };
    setActiveJob(newJob);
    setGeneratorStep('generating');
    addToast('info', 'Started Generation', `Encoding ${count} video variants in your browser.`);

    const variants: GeneratedVariant[] = initialVariants.map((variant) => ({ ...variant }));
    const startedAt = Date.now();
    const inputName = inputFilenameFor(sourceVideo);
    const jobPatchRef = { current: {} as Partial<GenerationJob> };
    let publishTimer: number | null = null;

    const flushJob = () => {
      if (publishTimer) {
        window.clearTimeout(publishTimer);
        publishTimer = null;
      }
      const patch = jobPatchRef.current;
      setActiveJob((prev) =>
        prev && prev.id === newJob.id
          ? { ...prev, variants: variants.map((variant) => ({ ...variant })), ...patch }
          : prev
      );
    };

    const publish = (patch: Partial<GenerationJob>, immediate = false) => {
      jobPatchRef.current = { ...jobPatchRef.current, ...patch };
      if (immediate) {
        flushJob();
        return;
      }
      if (publishTimer != null) return;
      publishTimer = window.setTimeout(flushJob, 120);
    };

    try {
      await getFFmpeg();
      if (runtimeRef.current.cancelled) return;

      const sourceBlob = await fetch(sourceVideo.url).then((res) => res.blob());
      await writeInputFile(inputName, sourceBlob);
      if (runtimeRef.current.cancelled) return;

      for (let i = 0; i < variants.length; i++) {
        while (runtimeRef.current.paused && !runtimeRef.current.cancelled) {
          await sleep(200);
        }
        if (runtimeRef.current.cancelled) return;

        variants[i] = {
          ...variants[i],
          status: 'processing',
          progress: 4,
          currentStage: 'Encoding MP4',
        };
        publish(
          {
            status: 'generating',
            progress: Math.round((i / variants.length) * 100),
            activeVariantIndex: i,
          },
          true
        );

        await writeInputFile(inputName, sourceBlob);
        if (runtimeRef.current.cancelled) return;

        const outName = `out_${variants[i].variantNumber.toString().padStart(2, '0')}.mp4`;
        const args = generateFFmpegArgs(
          inputName,
          outName,
          variants[i].adjustments,
          variants[i].aspectRatio,
          variants[i].quality,
          variants[i].optionalElements,
          variants[i].metadata,
          {
            preset: 'ultrafast',
            includeDrawtext: false,
            source: sourceVideo.resolution,
            wasmSafe: true,
          }
        );

        try {
          const runEncode = (encodeArgs: string[]) =>
            encodeToBlob(
              encodeArgs,
              outName,
              (ratio) => {
                if (runtimeRef.current.cancelled) return;
                variants[i] = {
                  ...variants[i],
                  status: 'processing',
                  progress: Math.round(4 + ratio * 90),
                  currentStage: ratio < 0.02 ? 'Starting encode' : 'Encoding MP4',
                };
                publish({
                  status: 'generating',
                  progress: Math.round(((i + ratio) / variants.length) * 100),
                  activeVariantIndex: i,
                });
              },
              {
                durationSeconds: sourceVideo.duration / (variants[i].adjustments.playbackSpeed || 1),
                onLog: (message) => {
                  if (runtimeRef.current.cancelled) return;
                  if (!/frame=|time=/.test(message)) return;
                  variants[i] = {
                    ...variants[i],
                    status: 'processing',
                    currentStage: message.length > 48 ? `${message.slice(0, 48)}…` : message,
                  };
                  publish({
                    status: 'generating',
                    activeVariantIndex: i,
                  });
                },
              }
            );

          const fallbackArgs = [
            generateFFmpegArgsWithoutAudio(args),
            generateMinimalWasmArgs(
              inputName,
              outName,
              variants[i].aspectRatio,
              variants[i].quality,
              sourceVideo.resolution
            ),
          ];

          const encodeWithFallback = async () => {
            try {
              return await runEncode(args);
            } catch {
              for (const nextArgs of fallbackArgs) {
                await writeInputFile(inputName, sourceBlob);
                try {
                  return await runEncode(nextArgs);
                } catch {
                  // Try the next simpler command.
                }
              }
              throw new Error('All encode attempts failed');
            }
          };

          let encoded: Blob;
          try {
            encoded = await encodeWithFallback();
          } catch {
            variants[i] = {
              ...variants[i],
              currentStage: 'Restarting encoder',
            };
            publish({ status: 'generating', activeVariantIndex: i }, true);
            await recoverEncoder(inputName, sourceBlob);
            encoded = await encodeWithFallback();
          }

          if (runtimeRef.current.cancelled) return;

          const metadata = variants[i].metadata || buildVariantMetadata(variants[i].variantNumber);
          const objectUrl = URL.createObjectURL(encoded);

          variants[i] = {
            ...variants[i],
            status: 'completed',
            progress: 100,
            currentStage: 'Completed',
            outputBlob: encoded,
            videoUrl: objectUrl,
            fileSize: formatBytes(encoded.size),
            metadata,
          };
          publish(
            {
              status: 'generating',
              progress: Math.round(((i + 1) / variants.length) * 100),
              activeVariantIndex: i,
            },
            true
          );
          await sleep(160);
        } catch (error) {
          if (runtimeRef.current.cancelled) return;
          const message = error instanceof Error ? error.message : 'Encode failed';
          variants[i] = {
            ...variants[i],
            status: 'failed',
            progress: 0,
            currentStage: 'Failed',
            error: message,
          };
          publish(
            {
              status: 'generating',
              progress: Math.round(((i + 1) / variants.length) * 100),
              activeVariantIndex: i,
            },
            true
          );
          await sleep(160);
        }
      }

      await deleteInputFile(inputName);
      if (runtimeRef.current.cancelled) return;

      const completed = variants.filter((variant) => variant.status === 'completed').length;
      const completedJob: GenerationJob = {
        ...newJob,
        status: completed > 0 ? 'completed' : 'failed',
        progress: 100,
        activeVariantIndex: variants.length,
        variants,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        totalRenderTimeMs: Date.now() - startedAt,
      };

      setActiveJob(completedJob);
      setGeneratedVariants(variants.filter((variant) => variant.outputBlob));

      if (completed > 0) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
        addToast('success', 'Generation Completed', `Encoded ${completed} of ${count} video variants.`);
        await sleep(900);
        if (!runtimeRef.current.cancelled) setGeneratorStep('results');
      } else {
        addToast('error', 'Generation Failed', 'The encoder could not create any variants.');
      }
    } catch (error) {
      if (runtimeRef.current.cancelled) return;
      const message = error instanceof Error ? error.message : 'Could not start the encoder.';
      setActiveJob((prev) => (prev ? { ...prev, status: 'failed' } : prev));
      addToast('error', 'Encoder Failed', message);
    }
  };

  const handlePauseResumeJob = () => {
    if (!activeJob || (activeJob.status !== 'generating' && activeJob.status !== 'paused')) return;
    const newStatus = activeJob.status === 'paused' ? 'generating' : 'paused';
    runtimeRef.current.paused = newStatus === 'paused';
    setActiveJob({ ...activeJob, status: newStatus });
    addToast(
      'info',
      'Status Updated',
      newStatus === 'paused'
        ? 'Pause will apply after the current variant finishes.'
        : 'Job is now generating.'
    );
  };

  const handleCancelJob = () => {
    runtimeRef.current.cancelled = true;
    runtimeRef.current.paused = false;
    terminateFFmpeg();
    setActiveJob(null);
    setGeneratorStep('config');
    addToast('warning', 'Generation Cancelled', 'Active job was cancelled.');
  };

  const getSpoofedBlob = async (variant: GeneratedVariant) => {
    const metadata = variant.metadata || buildVariantMetadata(variant.variantNumber);
    if (variant.outputBlob) return applyMetadataSpoof(variant.outputBlob, metadata);
    const sourceUrl = variant.videoUrl || sourceVideo?.url;
    if (!sourceUrl) throw new Error('No source video');
    const original = await fetch(sourceUrl).then((res) => res.blob());
    return applyMetadataSpoof(original, metadata);
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleUpdateVariantMetadata = (variantId: string, metadata: GeneratedVariant['metadata']) => {
    const apply = (variant: GeneratedVariant): GeneratedVariant => {
      if (variant.id !== variantId) return variant;
      const outName = `${(sourceVideo?.name || 'video').replace(/\.[^/.]+$/, '')}_var_${variant.variantNumber
        .toString()
        .padStart(2, '0')}.mp4`;
      return {
        ...variant,
        metadata,
        ffmpegCommand: generateFFmpegCommand(
          sourceVideo?.name || 'input.mp4',
          outName,
          variant.adjustments,
          variant.aspectRatio,
          variant.quality,
          variant.optionalElements,
          metadata,
          sourceVideo ? { source: sourceVideo.resolution } : undefined
        ),
      };
    };

    setGeneratedVariants((prev) => prev.map(apply));
    setActiveJob((prev) => (prev ? { ...prev, variants: prev.variants.map(apply) } : prev));
    setPreviewingVariant((prev) => (prev ? apply(prev) : prev));
  };

  const handleDownloadVariant = async (variant: GeneratedVariant) => {
    if (variant.status === 'failed' || !variant.outputBlob) {
      addToast('error', 'Download Failed', 'This variant was not encoded.');
      return;
    }
    try {
      const blob = await getSpoofedBlob(variant);
      triggerDownload(
        blob,
        `${sourceVideo?.name.replace(/\.[^/.]+$/, '') || 'video'}_variant_${variant.variantNumber}.mp4`
      );
      addToast('info', 'Download Started', `Downloading Variant #${variant.variantNumber}.`);
    } catch {
      addToast('error', 'Download Failed', 'Could not prepare this variant.');
    }
  };

  const handleDownloadAll = async () => {
    const ready = generatedVariants.filter((variant) => variant.outputBlob);
    if (ready.length === 0) return;

    addToast('info', 'Packaging ZIP', 'Creating variants ZIP archive...');
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Video_Variants_${Date.now()}`);

      const manifest = {
        app: 'Typhoon Agency Spoofer',
        sourceVideo: sourceVideo?.name,
        generatedAt: new Date().toISOString(),
        totalVariants: ready.length,
        variants: ready.map((v) => ({
          variantNumber: v.variantNumber,
          resolution: v.resolution,
          aspectRatio: v.aspectRatio,
          duration: v.duration,
          fileSize: v.fileSize,
          adjustments: v.adjustments,
          metadata: v.metadata,
          ffmpegCommand: v.ffmpegCommand,
        })),
      };

      folder?.file('manifest.json', JSON.stringify(manifest, null, 2));

      const bashScript =
        `#!/bin/bash\n# FFmpeg Batch Execution Script\n\n` +
        ready.map((v) => v.ffmpegCommand).join('\n\n');
      folder?.file('generate_all.sh', bashScript);

      for (const v of ready) {
        const encoded = await getSpoofedBlob(v);
        const safeRatio = String(v.aspectRatio).replace(':', 'x');
        folder?.file(
          `variant_${v.variantNumber.toString().padStart(2, '0')}_${safeRatio}.mp4`,
          encoded
        );
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `video_variants_${ready.length}_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addToast('success', 'ZIP Ready', 'ZIP archive downloaded.');
    } catch {
      addToast('error', 'ZIP Failed', 'Unable to create ZIP archive.');
    }
  };

  return (
    <div id="video-variant-generator-app" className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden select-none">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          activeProjectName={sourceVideo ? sourceVideo.name : undefined}
          hasActiveJob={activeJob?.status === 'generating'}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium w-fit">
              <button
                onClick={() => setGeneratorStep('config')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  generatorStep === 'config'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1. Setup & Config
              </button>

              <button
                disabled={!activeJob}
                onClick={() => activeJob && setGeneratorStep('generating')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  generatorStep === 'generating'
                    ? 'bg-zinc-800 text-zinc-100'
                    : !activeJob
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                2. Progress
              </button>

              <button
                disabled={generatedVariants.length === 0}
                onClick={() => generatedVariants.length > 0 && setGeneratorStep('results')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  generatorStep === 'results'
                    ? 'bg-zinc-800 text-zinc-100'
                    : generatedVariants.length === 0
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                3. Results ({generatedVariants.length})
              </button>
            </div>

            {generatorStep === 'config' && (
              <div className="space-y-6">
                <UploadSection
                  sourceVideo={sourceVideo}
                  onVideoSelected={(vid) => {
                    replaceSourceVideo(vid);
                    addToast('info', 'Video Selected', `Loaded "${vid.name}".`);
                  }}
                  onClearVideo={() => replaceSourceVideo(null)}
                />

                {sourceVideo && (
                  <VariantConfigPanel
                    config={variantConfig}
                    onChangeConfig={(updated) => setVariantConfig(updated)}
                    onGenerate={handleStartGeneration}
                    isGenerating={activeJob?.status === 'generating'}
                  />
                )}
              </div>
            )}

            {generatorStep === 'generating' && activeJob && (
              <GenerationProgress
                job={activeJob}
                onPauseResume={handlePauseResumeJob}
                onCancel={handleCancelJob}
              />
            )}

            {generatorStep === 'results' && (
              <ResultsGrid
                variants={generatedVariants}
                onPreviewVariant={(variant) => setPreviewingVariant(variant)}
                onDownloadVariant={handleDownloadVariant}
                onDownloadAll={handleDownloadAll}
                onNewGeneration={() => setGeneratorStep('config')}
              />
            )}
          </div>
        </main>
      </div>

      {previewingVariant && sourceVideo && (
        <VariantPreviewModal
          variant={previewingVariant}
          sourceVideo={sourceVideo}
          onClose={() => setPreviewingVariant(null)}
          onDownload={handleDownloadVariant}
          onChangeMetadata={(metadata) => handleUpdateVariantMetadata(previewingVariant.id, metadata)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
