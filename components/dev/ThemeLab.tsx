'use client';

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';

import { AppDialog } from '@/components/ui/AppDialog';

import {
  BUILT_IN_THEME_PRESETS,
  createThemeLabExport,
  getContrastRatio,
  getThemeContrastChecks,
  getThemeInteractionChecks,
  getThemeInteractionColors,
  isThemePaletteAccessible,
  normalizeHex,
  parseThemeLabImport,
  THEME_TOKEN_DEFINITIONS,
  THEME_TOKEN_KEYS,
  type ThemePalette,
  type ThemePreset,
  type ThemeTokenDefinition,
} from '@/lib/theme-lab';

interface ThemeLabProps {
  open: boolean;
  palette: ThemePalette;
  customPresets: ThemePreset[];
  hasOverrides: boolean;
  onClose: () => void;
  onPaletteChange: (palette: ThemePalette) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onRestoreDefaults: () => void;
}

interface ColorFieldProps {
  definition: ThemeTokenDefinition;
  value: string;
  onChange: (value: string) => void;
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-45';

function ColorField({ definition, value, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commitDraft = (nextValue: string) => {
    const normalized = normalizeHex(nextValue);
    if (normalized) onChange(normalized);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <input
          type="color"
          value={value}
          aria-label={`${definition.label}選色器`}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
        />
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-semibold text-gray-900">
            {definition.label}
            <input
              value={draft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDraft(nextValue);
                commitDraft(nextValue);
              }}
              onBlur={() => {
                const normalized = normalizeHex(draft);
                setDraft(normalized ?? value);
              }}
              spellCheck={false}
              inputMode="text"
              aria-label={`${definition.label} HEX 色碼`}
              className="mt-1 block h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 font-mono text-xs font-medium uppercase tracking-wide text-gray-800 focus:border-gray-500 focus:outline-none"
            />
          </label>
          <p className="mt-1.5 text-xs leading-5 text-gray-500">{definition.description}</p>
        </div>
      </div>
    </div>
  );
}

function PresetCard({ preset, custom = false, onApply, onDelete, selected = false }: {
  preset: ThemePreset;
  custom?: boolean;
  onApply: () => void;
  onDelete?: () => void;
  selected?: boolean;
}) {
  return <div className={`flex flex-col gap-3 rounded-2xl border bg-white p-3 ${selected ? 'border-gray-700 ring-1 ring-inset ring-gray-700' : 'border-gray-200'}`}>
    <div className="flex items-center justify-between gap-2">
      <div className={`grid h-8 grid-cols-4 overflow-hidden rounded-lg border border-gray-200 ${custom ? 'w-24' : 'w-full'}`} aria-hidden="true">
        {(['primary', 'secondary', 'background', 'card'] as const).map(key => <span key={key} style={{ backgroundColor: preset.palette[key] }} />)}
      </div>
      {custom && onDelete && <button type="button" onClick={onDelete} aria-label={`刪除配色 ${preset.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>}
    </div>
    <div className="min-w-0 flex-1">
      <p className="break-words text-sm font-semibold text-gray-900">{preset.name}</p>
      {preset.description && <p className="mt-1 text-xs leading-5 text-gray-600">{preset.description}</p>}
    </div>
    <button type="button" onClick={onApply} aria-pressed={selected} aria-label={`套用「${preset.name}」配色`} className={`${buttonClass} w-full`}>
      {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {selected ? '使用中' : '套用配色'}
    </button>
  </div>;
}

function ContrastRow({ label, first, second, minimum = 4.5 }: { label: string; first: string; second: string; minimum?: number }) {
  const ratio = getContrastRatio(first, second);
  const passes = ratio >= minimum;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <span className="flex shrink-0 overflow-hidden rounded-full border border-gray-200">
        <span className="h-6 w-6" style={{ backgroundColor: first }} />
        <span className="h-6 w-6" style={{ backgroundColor: second }} />
      </span>
      <span className="min-w-0 flex-1 text-xs font-medium text-gray-700">{label}</span>
      <span title={`門檻 ${minimum}:1；${passes ? '通過' : '待調整'}`} className={`inline-flex items-center gap-1 text-xs font-semibold ${passes ? 'text-emerald-700' : 'text-amber-700'}`}>
        {passes ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
        <span className="sr-only">{passes ? '通過' : '待調整'}，門檻 {minimum}:1，實際 </span>
        {(Math.floor(ratio * 100) / 100).toFixed(2)}:1
      </span>
    </div>
  );
}

export function ThemeLab({
  open,
  palette,
  customPresets,
  hasOverrides,
  onClose,
  onPaletteChange,
  onSavePreset,
  onDeletePreset,
  onRestoreDefaults,
}: ThemeLabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetName, setPresetName] = useState('');
  const [feedback, setFeedback] = useState({ text: '', sequence: 0 });
  const message = feedback.text;
  const setMessage = (text: string) => setFeedback(current => ({ text, sequence: current.sequence + 1 }));

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setFeedback(current => current.sequence === feedback.sequence ? { ...current, text: '' } : current), 4000);
    return () => clearTimeout(timeout);
  }, [message, feedback.sequence]);

  const contrastChecks = getThemeContrastChecks(palette);
  const interactionChecks = getThemeInteractionChecks(palette);
  const interactionColors = getThemeInteractionColors(palette);
  const paletteIsAccessible = isThemePaletteAccessible(palette);
  const isSelected = (preset: ThemePreset) => THEME_TOKEN_KEYS.every(key => preset.palette[key] === palette[key]);
  const currentPreset = customPresets.find(isSelected) ?? BUILT_IN_THEME_PRESETS.find(isSelected);
  const currentThemeLabel = currentPreset?.name ?? (hasOverrides ? '自訂配色' : '預設配色');

  const applyPreset = (preset: ThemePreset) => {
    onPaletteChange({ ...preset.palette });
    setMessage(isThemePaletteAccessible(preset.palette)
      ? `已套用「${preset.name}」`
      : `正在預覽「${preset.name}」；對比不足，關閉後會還原。`);
  };

  const updateToken = (key: keyof ThemePalette, value: string) => {
    onPaletteChange({ ...palette, [key]: value });
  };

  const exportPayload = () => createThemeLabExport(presetName || 'Féria 自訂配色', palette);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2));
      setMessage('已複製配色 JSON');
    } catch {
      setMessage('無法使用剪貼簿，請改用下載 JSON');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `feria-theme-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('已匯出配色檔');
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = parseThemeLabImport(await file.text());
      onPaletteChange(imported.palette);
      setPresetName(imported.name);
      setMessage(`已匯入「${imported.name}」`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '無法讀取配色檔');
    }
  };

  const savePreset = () => {
    const normalizedName = presetName.trim();
    if (!normalizedName) {
      setMessage('請先輸入配色名稱');
      return;
    }
    if (!paletteIsAccessible) {
      setMessage('目前配色有未通過 AA 的文字組合，請調整後再儲存');
      return;
    }
    onSavePreset(normalizedName);
    setPresetName('');
    setMessage('已儲存在這台裝置');
  };

  return (
    <AppDialog open={open} onClose={onClose} title="外觀與主題"
      description="選擇後立即套用；個人配色僅儲存在這台裝置。" size="xl" className="bg-gray-50 text-gray-900"
      footer={<div className="flex w-full items-center justify-between gap-3">
        <p role="status" aria-live="polite" aria-atomic="true" className="min-w-0 break-words text-sm leading-6 text-gray-900">
          <span key={feedback.sequence}>{message || `目前配色：${currentThemeLabel}`}</span>
        </p>
        <button type="button" onClick={onClose} className={`${buttonClass} shrink-0`}>完成</button>
      </div>}>
      <div className="space-y-5">
        <section aria-label="主題預覽" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="relative px-4 py-5 text-white" style={{ background: `linear-gradient(135deg, ${interactionColors.headerPrimary}, ${interactionColors.headerSecondary})` }}>
            <Sparkles className="absolute right-4 top-4 h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-medium">目前配色：{currentThemeLabel}</p>
            <h3 className="mt-2 pr-6 text-xl font-semibold">今天也一起，把市集過得從容。</h3>
          </div>
          <div className="p-3" style={{ backgroundColor: palette.background }}>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: palette.card }}>
              <p className="text-sm font-semibold" style={{ color: palette.foreground }}>暖暖市集</p>
              <p className="mt-1 text-xs" style={{ color: palette.mutedForeground }}>本週六 · 11:00 開始</p>
            </div>
          </div>
        </section>
        <section aria-labelledby="preset-title">
          <h3 id="preset-title" className="text-base font-semibold text-gray-950">精選主題</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {BUILT_IN_THEME_PRESETS.map(preset => <PresetCard key={preset.id} preset={preset} selected={isSelected(preset)} onApply={() => applyPreset(preset)} />)}
          </div>
        </section>
        {customPresets.length > 0 && <section aria-labelledby="saved-preset-title">
          <h3 id="saved-preset-title" className="text-base font-semibold text-gray-950">我的配色</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customPresets.map(preset => <PresetCard key={preset.id} preset={preset} custom selected={isSelected(preset)}
              onApply={() => applyPreset(preset)} onDelete={() => { onDeletePreset(preset.id); setMessage(`已移除「${preset.name}」收藏，目前配色維持不變。`); }} />)}
          </div>
        </section>}
        {!paletteIsAccessible && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">目前為預覽配色，文字對比不足；請在進階調整修正，關閉後會還原至上次可用配色。</p>}
        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900">
            <span>進階調整</span><span className="text-xs text-gray-600 group-open:hidden">展開</span><span className="hidden text-xs text-gray-600 group-open:inline">收合</span>
          </summary>
          <div className="mt-3 space-y-5">
                <section aria-labelledby="theme-color-title" className="mt-4 border-t border-gray-200 pt-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 id="theme-color-title" className="text-sm font-bold text-gray-950">核心色彩</h3>
                      <p className="mt-1 text-xs text-gray-500">輸入六位 HEX 色碼，或使用左側選色器。</p>
                    </div>
                    <button type="button" onClick={() => { onRestoreDefaults(); setMessage('已恢復預設配色'); }} className={`${buttonClass} w-full sm:w-auto`}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      恢復預設配色
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {THEME_TOKEN_DEFINITIONS.filter(definition => definition.editable !== false).map((definition) => (
                      <ColorField
                        key={definition.key}
                        definition={definition}
                        value={palette[definition.key]}
                        onChange={(value) => updateToken(definition.key, value)}
                      />
                    ))}
                  </div>
                </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-950">儲存目前組合</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500">保留多組方案，方便來回比較。</p>
                {!paletteIsAccessible && (
                  <p id="theme-save-contrast-error" className="mt-2 flex gap-2 text-xs font-medium leading-5 text-amber-800" role="alert">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    請先修正未通過 AA 的文字組合，再儲存這組配色。
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    maxLength={40}
                    placeholder="例如：秋日市集 A"
                    aria-label="自訂配色名稱"
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={savePreset}
                    className={buttonClass}
                    disabled={!paletteIsAccessible}
                    aria-describedby={!paletteIsAccessible ? 'theme-save-contrast-error' : undefined}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    儲存
                  </button>
                </div>
              </section>


              <section aria-labelledby="contrast-title" className="rounded-3xl border border-gray-200 bg-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="contrast-title" className="text-sm font-bold text-gray-950">核心文字對比檢查</h3>
                  <span className="text-[11px] font-semibold text-gray-500">AA ≥ 4.5:1</span>
                </div>
                <div className="mt-3 space-y-2">
                  {contrastChecks.map((check) => (
                    <ContrastRow key={check.id} label={check.label} first={check.foreground} second={check.background} />
                  ))}
                </div>
                <p className="mt-3 flex gap-2 text-xs leading-5 text-gray-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  低於標準仍可自由預覽，但不能儲存為配色；關閉後會回復最近一次通過檢查的配色。
                </p>
                <details className="mt-4 border-t border-gray-300 pt-3">
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900">
                    互動情境檢查（{interactionChecks.filter(check => check.passes).length}/{interactionChecks.length} 通過）
                  </summary>
                  <div className="mt-2 space-y-2">
                    {interactionChecks.map(check => <ContrastRow key={check.id} label={check.label} first={check.foreground} second={check.background} minimum={check.minimum} />)}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-gray-600">文字門檻為 4.5:1；必要外框、焦點與圖形為 3:1。此處提供情境檢查，不改動既有配色的五項儲存規則，也不代表全站已通過無障礙驗證。</p>
                </details>
              </section>


              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-950">匯入與匯出</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500">備份或分享個人配色設定。</p>
                <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importJson} className="hidden" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass}>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    匯入 JSON
                  </button>
                  <button type="button" onClick={downloadJson} className={buttonClass}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    下載 JSON
                  </button>
                  <button type="button" onClick={copyJson} className={`${buttonClass} col-span-2`}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    複製 JSON
                  </button>
                </div>
              </section>
          </div>
        </details>
      </div>
    </AppDialog>
  );
}
