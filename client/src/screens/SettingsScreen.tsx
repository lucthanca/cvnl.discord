import React from 'react';
import { useTheme, ThemeType } from '../contexts/ThemeContext';
import { 
  PaintBrushIcon, 
  InformationCircleIcon, 
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const SettingsScreen: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeType; label: string; color: string }[] = [
    { value: 'light', label: 'Light', color: '#f9fafb' },
    { value: 'dark', label: 'Dark', color: '#111827' },
    { value: 'purple', label: 'Purple', color: '#1e1b4b' },
    { value: 'blue', label: 'Blue', color: '#0c4a6e' },
    { value: 'green', label: 'Green', color: '#14532d' },
  ];

  const menuItems = [
    {
      icon: InformationCircleIcon,
      label: 'About',
      value: 'Version 1.0.0',
      onClick: () => console.log('About clicked'),
    },
    {
      icon: QuestionMarkCircleIcon,
      label: 'FAQ',
      onClick: () => console.log('FAQ clicked'),
    },
    {
      icon: DocumentTextIcon,
      label: 'Terms of Service',
      onClick: () => console.log('Terms clicked'),
    },
    {
      icon: ShieldCheckIcon,
      label: 'Privacy Policy',
      onClick: () => console.log('Privacy clicked'),
    },
  ];

  // Add a small delay to ensure theme is properly loaded
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-screen bg-theme-bg text-theme-text flex flex-col">
        <div className="bg-theme-nav border-b border-theme-border p-4 flex-shrink-0">
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-theme-bg text-theme-text flex flex-col">
      {/* Header */}
      <div className="bg-theme-nav border-b border-theme-border p-4 flex-shrink-0">
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="flex-1 w-full overflow-y-auto p-4 space-y-6">
        {/* Theme Selection */}
        <div className="bg-theme-nav rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <PaintBrushIcon className="w-6 h-6 text-theme-primary" />
            <h2 className="text-lg font-medium">Theme</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  theme === themeOption.value
                    ? 'border-theme-primary bg-theme-primary/10'
                    : 'border-theme-border hover:border-theme-primary/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full border border-theme-border"
                    style={{ backgroundColor: themeOption.color }}
                  />
                  <span className="font-medium">{themeOption.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-theme-nav rounded-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-4 hover:bg-theme-primary/5 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-theme-border' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-6 h-6 text-theme-text-secondary" />
                <span className="font-medium">{item.label}</span>
              </div>
              {'value' in item && (
                <span className="text-theme-text-secondary text-sm">{item.value}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
