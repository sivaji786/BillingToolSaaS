import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useLanguage } from '../contexts/LanguageContext';
import { Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
}

const defaultTheme: ThemeColors = {
  primary: '#7c3aed',
  secondary: '#f3e8ff',
  accent: '#fae8ff',
  background: '#fafafa',
  foreground: '#1a1a2e',
  card: '#ffffff',
  border: '#d4c5e8',
  muted: '#f5f5f5',
};

const THEME_STORAGE_KEY = 'invoice-builder-theme';

export function ThemeBuilder() {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
        applyTheme(parsedTheme);
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
      }
    }
  }, []);

  const applyTheme = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.border);
    root.style.setProperty('--muted', colors.muted);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    const newTheme = { ...theme, [key]: value };
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleSaveTheme = () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    applyTheme(theme);
    toast.success(t('settings.themeSaved') || 'Theme saved successfully', {
      description: t('settings.themeSavedDesc') || 'Your custom theme has been applied',
    });
  };

  const handleResetTheme = () => {
    setTheme(defaultTheme);
    applyTheme(defaultTheme);
    localStorage.removeItem(THEME_STORAGE_KEY);
    toast.success(t('settings.themeReset') || 'Theme reset to default', {
      description: t('settings.themeResetDesc') || 'The default purple theme has been restored',
    });
  };

  const presetThemes = [
    {
      name: t('settings.presetPurple') || 'Purple (Default)',
      colors: defaultTheme,
    },
    {
      name: t('settings.presetBlue') || 'Blue Professional',
      colors: {
        primary: '#2563eb',
        secondary: '#dbeafe',
        accent: '#e0f2fe',
        background: '#fafafa',
        foreground: '#1a1a2e',
        card: '#ffffff',
        border: '#bfdbfe',
        muted: '#f5f5f5',
      },
    },
    {
      name: t('settings.presetGreen') || 'Green Finance',
      colors: {
        primary: '#059669',
        secondary: '#d1fae5',
        accent: '#d1fae5',
        background: '#fafafa',
        foreground: '#1a1a2e',
        card: '#ffffff',
        border: '#a7f3d0',
        muted: '#f5f5f5',
      },
    },
    {
      name: t('settings.presetOrange') || 'Orange Energy',
      colors: {
        primary: '#ea580c',
        secondary: '#fed7aa',
        accent: '#ffedd5',
        background: '#fafafa',
        foreground: '#1a1a2e',
        card: '#ffffff',
        border: '#fdba74',
        muted: '#f5f5f5',
      },
    },
    {
      name: t('settings.presetSlate') || 'Slate Corporate',
      colors: {
        primary: '#475569',
        secondary: '#e2e8f0',
        accent: '#f1f5f9',
        background: '#fafafa',
        foreground: '#1a1a2e',
        card: '#ffffff',
        border: '#cbd5e1',
        muted: '#f5f5f5',
      },
    },
  ];

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setTheme(preset.colors);
    applyTheme(preset.colors);
    toast.success(t('settings.presetApplied') || 'Preset applied', {
      description: `${preset.name} ${t('settings.hasBeenApplied') || 'has been applied'}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card className="p-6 space-y-4">
        <div>
          <h3>{t('settings.colorPresets') || 'Color Presets'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.colorPresetsDesc') || 'Quick start with predefined color schemes'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {presetThemes.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className="p-4 rounded-lg border-2 hover:border-primary transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: preset.colors.primary }}
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  {preset.name}
                </span>
              </div>
              <div className="flex gap-1">
                <div
                  className="h-3 flex-1 rounded"
                  style={{ backgroundColor: preset.colors.primary }}
                />
                <div
                  className="h-3 flex-1 rounded"
                  style={{ backgroundColor: preset.colors.secondary }}
                />
                <div
                  className="h-3 flex-1 rounded"
                  style={{ backgroundColor: preset.colors.accent }}
                />
                <div
                  className="h-3 flex-1 rounded border"
                  style={{ backgroundColor: preset.colors.background }}
                />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Custom Colors */}
      <Card className="p-6 space-y-4">
        <div>
          <h3>{t('settings.customColors') || 'Custom Colors'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.customColorsDesc') || 'Fine-tune individual color values'}
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">
              {t('settings.primaryColor') || 'Primary Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={theme.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                placeholder="#7c3aed"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-color">
              {t('settings.secondaryColor') || 'Secondary Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={theme.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                placeholder="#f3e8ff"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent-color">
              {t('settings.accentColor') || 'Accent Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="accent-color"
                type="color"
                value={theme.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                placeholder="#fae8ff"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-color">
              {t('settings.backgroundColor') || 'Background Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="background-color"
                type="color"
                value={theme.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                placeholder="#fafafa"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-color">
              {t('settings.cardColor') || 'Card Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="card-color"
                type="color"
                value={theme.card}
                onChange={(e) => handleColorChange('card', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.card}
                onChange={(e) => handleColorChange('card', e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="border-color">
              {t('settings.borderColor') || 'Border Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="border-color"
                type="color"
                value={theme.border}
                onChange={(e) => handleColorChange('border', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.border}
                onChange={(e) => handleColorChange('border', e.target.value)}
                placeholder="#d4c5e8"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="muted-color">
              {t('settings.mutedColor') || 'Muted Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="muted-color"
                type="color"
                value={theme.muted}
                onChange={(e) => handleColorChange('muted', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.muted}
                onChange={(e) => handleColorChange('muted', e.target.value)}
                placeholder="#f5f5f5"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foreground-color">
              {t('settings.foregroundColor') || 'Text Color'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="foreground-color"
                type="color"
                value={theme.foreground}
                onChange={(e) => handleColorChange('foreground', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.foreground}
                onChange={(e) => handleColorChange('foreground', e.target.value)}
                placeholder="#1a1a2e"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button onClick={handleSaveTheme} className="flex-1">
            <Palette className="h-4 w-4 mr-2" />
            {t('settings.saveTheme') || 'Save Theme'}
          </Button>
          <Button onClick={handleResetTheme} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('settings.resetTheme') || 'Reset to Default'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6 space-y-4">
        <div>
          <h3>{t('settings.themePreview') || 'Theme Preview'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.themePreviewDesc') || 'See how your theme looks'}
          </p>
        </div>

        <div className="space-y-3 p-4 rounded-lg border-2">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: theme.primary }}
            >
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h4 style={{ color: theme.foreground }}>Sample Heading</h4>
              <p className="text-sm" style={{ color: theme.foreground }}>
                This is sample text content
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              style={{
                backgroundColor: theme.primary,
                color: '#ffffff',
              }}
            >
              Primary Button
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              style={{
                borderColor: theme.border,
                color: theme.foreground,
              }}
            >
              Secondary Button
            </Button>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: theme.secondary }}
          >
            <p className="text-sm" style={{ color: theme.foreground }}>
              {t('settings.secondaryBackground') || 'Secondary background color preview'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
