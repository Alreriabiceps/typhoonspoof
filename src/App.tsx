import React, { useState, useEffect, useRef } from 'react';
import {
  NavPage,
  SourceVideo,
  VariantConfig,
  GeneratedVariant,
  GenerationJob,
  Project,
  AppSettings,
  ToastMessage,
} from './types';
import { SAMPLE_VIDEOS } from './data/sampleVideos';
import { DEFAULT_ADJUSTMENTS, DEFAULT_OPTIONAL_ELEMENTS } from './data/presets';
import { INITIAL_PROJECTS, INITIAL_HISTORY } from './data/mockProjects';
import {
  generateFFmpegCommand,
  generateRandomizedAdjustments,
  getResolutionForFormat,
} from './utils/ffmpegGenerator';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { UploadSection } from './components/generator/UploadSection';
import { VariantConfigPanel } from './components/generator/VariantConfigPanel';
import { GenerationProgress } from './components/generator/GenerationProgress';
import { ResultsGrid } from './components/generator/ResultsGrid';
import { VariantPreviewModal } from './components/generator/VariantPreviewModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';

import JSZip from 'jszip';
import confetti from 'canvas-confetti';

const STORAGE_KEYS = {
  PROJECTS: 'vvg_projects_data',
  HISTORY: 'vvg_history_data',
  SETTINGS: 'vvg_settings_data',
};

export default function App() {
  // Navigation & Page State
  const [activePage, setActivePage] = useState<NavPage>('generator');

  // Generator Workflow State
  const [generatorStep, setGeneratorStep] = useState<'config' | 'generating' | 'results'>('config');
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(SAMPLE_VIDEOS[0]);
  const [variantConfig, setVariantConfig] = useState<VariantConfig>({
    variantCount: 5,
    mode: 'manual',
    preset: 'social-media',
    format: '9:16',
    quality: 'high',
    adjustments: DEFAULT_ADJUSTMENTS,
    optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
  });

  // Active Job & Results
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [previewingVariant, setPreviewingVariant] = useState<GeneratedVariant | null>(null);

  // App Data & History State with LocalStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [history, setHistory] = useState<GenerationJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      defaultFormat: '9:16',
      defaultQuality: 'high',
      defaultVariantCount: 5,
      outputFolder: 'downloads/variants',
      backendApiUrl: 'http://localhost:8000/api/v1/generate-variants',
      backendConnected: true,
      hardwareAcceleration: 'cpu',
      exportNamingPattern: '{filename}_var_{variant_num}_{ratio}.mp4',
      autoZipOnComplete: false,
      concurrentThreads: 4,
      soundNotifications: true,
    };
  });

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Timer Ref for Generation Simulation
  const jobIntervalRef = useRef<number | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

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

  // Start Generation Action
  const handleStartGeneration = () => {
    if (!sourceVideo) {
      addToast('warning', 'No Video Selected', 'Please select or upload a video first.');
      return;
    }

    const count = variantConfig.variantCount;
    const isRandomized = variantConfig.mode === 'randomized';

    // Prepare initial variant list
    const initialVariants: GeneratedVariant[] = Array.from({ length: count }, (_, i) => {
      const variantNumber = i + 1;
      let adj = { ...variantConfig.adjustments };
      let fmt = variantConfig.format;
      let qual = variantConfig.quality;

      if (isRandomized) {
        adj = generateRandomizedAdjustments(adj, i);
      } else if (variantConfig.mode === 'preset' && variantConfig.preset === 'social-media') {
        const fmtCycle: any[] = ['9:16', '1:1', '4:5', '16:9'];
        fmt = fmtCycle[i % fmtCycle.length];
      }

      const res = getResolutionForFormat(fmt, qual);
      const durSec = Math.round(sourceVideo.duration / (adj.playbackSpeed || 1.0));
      const durLabel = `00:${durSec < 10 ? '0' + durSec : durSec}`;
      const sizeMb = (
        (sourceVideo.size / (1024 * 1024)) *
        (qual === 'compressed' ? 0.35 : qual === 'medium' ? 0.65 : 0.9) /
        (adj.playbackSpeed || 1.0)
      ).toFixed(1);

      const outName = `${sourceVideo.name.replace(/\.[^/.]+$/, '')}_var_${variantNumber.toString().padStart(2, '0')}.mp4`;
      const cmd = generateFFmpegCommand(sourceVideo.name, outName, adj, fmt, qual, variantConfig.optionalElements);

      return {
        id: `var-${Date.now()}-${variantNumber}`,
        variantNumber,
        title: `Variant #${variantNumber} (${fmt})`,
        resolution: res.label,
        aspectRatio: fmt,
        duration: durLabel,
        fileSize: `${sizeMb} MB`,
        format: 'MP4 (H.264)',
        quality: qual,
        adjustments: adj,
        optionalElements: variantConfig.optionalElements,
        status: i === 0 ? 'processing' : 'queued',
        progress: i === 0 ? 10 : 0,
        currentStage: i === 0 ? 'Processing video' : 'Queued',
        thumbnail: sourceVideo.thumbnailUrl,
        videoUrl: sourceVideo.url,
        ffmpegCommand: cmd,
      };
    });

    const newJob: GenerationJob = {
      id: `job-${Date.now()}`,
      projectId: `proj-${Date.now()}`,
      projectName: `${sourceVideo.name.replace(/\.[^/.]+$/, '')} Variants`,
      sourceVideo,
      variantCount: count,
      mode: variantConfig.mode,
      presetName: variantConfig.mode === 'preset' ? variantConfig.preset : undefined,
      status: 'generating',
      progress: 0,
      activeVariantIndex: 0,
      variants: initialVariants,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveJob(newJob);
    setGeneratorStep('generating');
    addToast('info', 'Started Generation', `Generating ${count} video variants.`);

    // Simulation engine
    let currentIdx = 0;
    let variantProg = 10;
    const stages = [
      'Cropping & Scaling',
      'Adjusting Color',
      'Applying Rotation',
      'Rendering Overlays',
      'Encoding MP4',
    ];

    if (jobIntervalRef.current) clearInterval(jobIntervalRef.current);

    jobIntervalRef.current = window.setInterval(() => {
      variantProg += 25;

      setActiveJob((prevJob) => {
        if (!prevJob || prevJob.status !== 'generating') return prevJob;

        const updatedVariants = [...prevJob.variants];
        const currentVariant = updatedVariants[currentIdx];

        if (variantProg < 100) {
          const stageIndex = Math.min(stages.length - 1, Math.floor(variantProg / 20));
          if (currentVariant) {
            currentVariant.status = 'processing';
            currentVariant.progress = variantProg;
            currentVariant.currentStage = stages[stageIndex];
          }
        } else {
          if (currentVariant) {
            currentVariant.status = 'completed';
            currentVariant.progress = 100;
            currentVariant.currentStage = 'Completed';
          }

          currentIdx++;
          variantProg = 0;

          if (currentIdx < updatedVariants.length) {
            updatedVariants[currentIdx].status = 'processing';
            updatedVariants[currentIdx].progress = 15;
            updatedVariants[currentIdx].currentStage = stages[0];
          }
        }

        const overallProg = Math.min(100, Math.round(((currentIdx * 100 + variantProg) / (updatedVariants.length * 100)) * 100));

        if (currentIdx >= updatedVariants.length) {
          if (jobIntervalRef.current) clearInterval(jobIntervalRef.current);

          const completedJob: GenerationJob = {
            ...prevJob,
            status: 'completed',
            progress: 100,
            activeVariantIndex: updatedVariants.length,
            variants: updatedVariants,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            totalRenderTimeMs: count * 1500,
          };

          const newProject: Project = {
            id: completedJob.projectId,
            name: completedJob.projectName,
            description: `Generated ${count} variants (${completedJob.mode} mode).`,
            sourceVideo: completedJob.sourceVideo,
            variantCount: count,
            createdAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            lastModified: 'Just now',
            status: 'completed',
            variants: updatedVariants,
            config: variantConfig,
          };

          setProjects((prev) => [newProject, ...prev]);
          setHistory((prev) => [completedJob, ...prev]);
          setGeneratedVariants(updatedVariants);

          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {}

          addToast('success', 'Generation Completed', `Created ${count} video variants.`);

          setTimeout(() => {
            setGeneratorStep('results');
          }, 400);

          return completedJob;
        }

        return {
          ...prevJob,
          progress: overallProg,
          activeVariantIndex: currentIdx,
          variants: updatedVariants,
        };
      });
    }, 200);
  };

  const handlePauseResumeJob = () => {
    if (!activeJob) return;
    const newStatus = activeJob.status === 'paused' ? 'generating' : 'paused';
    setActiveJob({ ...activeJob, status: newStatus });
    addToast('info', 'Status Updated', `Job is now ${newStatus}.`);
  };

  const handleCancelJob = () => {
    if (jobIntervalRef.current) clearInterval(jobIntervalRef.current);
    setActiveJob(null);
    setGeneratorStep('config');
    addToast('warning', 'Generation Cancelled', 'Active job was cancelled.');
  };

  // Download Single Variant
  const handleDownloadVariant = (variant: GeneratedVariant) => {
    const a = document.createElement('a');
    a.href = variant.videoUrl;
    a.download = `${sourceVideo?.name.replace(/\.[^/.]+$/, '') || 'video'}_variant_${variant.variantNumber}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('info', 'Download Started', `Downloading Variant #${variant.variantNumber}.`);
  };

  // Download All Variants
  const handleDownloadAll = () => {
    if (generatedVariants.length === 0) return;
    addToast('info', 'Downloading All', `Downloading ${generatedVariants.length} files.`);
    generatedVariants.forEach((v, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = v.videoUrl;
        a.download = `variant_${v.variantNumber.toString().padStart(2, '0')}_${v.aspectRatio}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 200);
    });
  };

  // Create ZIP Archive
  const handleCreateZip = async () => {
    if (generatedVariants.length === 0) return;

    addToast('info', 'Packaging ZIP', 'Creating variants ZIP archive...');
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Video_Variants_${Date.now()}`);

      const manifest = {
        app: 'Video Variant Generator',
        sourceVideo: sourceVideo?.name,
        generatedAt: new Date().toISOString(),
        totalVariants: generatedVariants.length,
        variants: generatedVariants.map((v) => ({
          variantNumber: v.variantNumber,
          resolution: v.resolution,
          aspectRatio: v.aspectRatio,
          duration: v.duration,
          fileSize: v.fileSize,
          adjustments: v.adjustments,
          ffmpegCommand: v.ffmpegCommand,
        })),
      };

      folder?.file('manifest.json', JSON.stringify(manifest, null, 2));

      const bashScript = `#!/bin/bash\n# FFmpeg Batch Execution Script\n\n` +
        generatedVariants.map((v) => v.ffmpegCommand).join('\n\n');
      folder?.file('generate_all.sh', bashScript);

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `video_variants_${generatedVariants.length}_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addToast('success', 'ZIP Ready', 'ZIP archive downloaded.');
    } catch {
      addToast('error', 'ZIP Failed', 'Unable to create ZIP archive.');
    }
  };

  const handleOpenProjectInStudio = (project: Project) => {
    setSourceVideo(project.sourceVideo);
    setVariantConfig(project.config || variantConfig);
    setGeneratedVariants(project.variants || []);
    setGeneratorStep(project.variants && project.variants.length > 0 ? 'results' : 'config');
    setActivePage('generator');
    addToast('info', 'Project Loaded', `Opened "${project.name}".`);
  };

  const handleOpenJobInStudio = (job: GenerationJob) => {
    setSourceVideo(job.sourceVideo);
    setGeneratedVariants(job.variants || []);
    setGeneratorStep('results');
    setActivePage('generator');
    addToast('info', 'Job Loaded', `Loaded ${job.variantCount} variants from history.`);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    addToast('info', 'Project Deleted', 'Project removed from list.');
  };

  return (
    <div id="video-variant-generator-app" className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden select-none">
      {/* Left Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(page) => setActivePage(page)}
        activeJobCount={activeJob && activeJob.status === 'generating' ? 1 : 0}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          activePage={activePage}
          onNavigateToGenerator={
            activePage !== 'generator'
              ? () => {
                  setActivePage('generator');
                  setGeneratorStep('config');
                }
              : undefined
          }
          activeProjectName={sourceVideo ? sourceVideo.name : undefined}
          hasActiveJob={activeJob?.status === 'generating'}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === 'dashboard' && (
            <DashboardView
              projects={projects}
              history={history}
              onStartNewJob={() => {
                setActivePage('generator');
                setGeneratorStep('config');
              }}
              onOpenProject={handleOpenProjectInStudio}
            />
          )}

          {activePage === 'generator' && (
            <div className="space-y-6 max-w-5xl mx-auto pb-10">
              {/* Step Navigation Tabs */}
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

              {/* Sub-View: Config & Upload */}
              {generatorStep === 'config' && (
                <div className="space-y-6">
                  <UploadSection
                    sourceVideo={sourceVideo}
                    onVideoSelected={(vid) => {
                      setSourceVideo(vid);
                      addToast('info', 'Video Selected', `Loaded "${vid.name}".`);
                    }}
                    onClearVideo={() => setSourceVideo(null)}
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

              {/* Sub-View: Live Generation Progress */}
              {generatorStep === 'generating' && activeJob && (
                <GenerationProgress
                  job={activeJob}
                  onPauseResume={handlePauseResumeJob}
                  onCancel={handleCancelJob}
                />
              )}

              {/* Sub-View: Results Grid */}
              {generatorStep === 'results' && (
                <ResultsGrid
                  variants={generatedVariants}
                  onPreviewVariant={(variant) => setPreviewingVariant(variant)}
                  onDownloadVariant={handleDownloadVariant}
                  onDownloadAll={handleDownloadAll}
                  onExportZip={handleCreateZip}
                  onNewGeneration={() => setGeneratorStep('config')}
                />
              )}
            </div>
          )}

          {activePage === 'projects' && (
            <ProjectsView
              projects={projects}
              onOpenProject={handleOpenProjectInStudio}
              onDeleteProject={handleDeleteProject}
              onStartNewProject={() => {
                setActivePage('generator');
                setGeneratorStep('config');
              }}
              onDownloadProjectVariants={(project) => {
                if (project.variants && project.variants.length > 0) {
                  setGeneratedVariants(project.variants);
                  setSourceVideo(project.sourceVideo);
                  handleDownloadAll();
                } else {
                  addToast('warning', 'No Variants', 'No generated variants in this project.');
                }
              }}
            />
          )}

          {activePage === 'history' && (
            <HistoryView
              history={history}
              onOpenJobInStudio={handleOpenJobInStudio}
              onDownloadAllVariants={(job) => {
                if (job.variants && job.variants.length > 0) {
                  setGeneratedVariants(job.variants);
                  setSourceVideo(job.sourceVideo);
                  handleDownloadAll();
                }
              }}
            />
          )}

          {activePage === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(updated) => {
                setSettings(updated);
                addToast('success', 'Saved', 'Settings updated.');
              }}
            />
          )}
        </main>
      </div>

      {/* Interactive Variant Preview Modal */}
      {previewingVariant && sourceVideo && (
        <VariantPreviewModal
          variant={previewingVariant}
          sourceVideo={sourceVideo}
          onClose={() => setPreviewingVariant(null)}
          onDownload={handleDownloadVariant}
        />
      )}

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
