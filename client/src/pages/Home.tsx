import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { BibleReader } from '@/components/BibleReader';
import { ToolsPanel } from '@/components/ToolsPanel';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Translation } from '@/lib/bibleData';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(1);

  // ✅ Strong’s ON by default now
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(true);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [displayMode, setDisplayMode] = useState<'verse' | 'book'>('verse');
  const [selectedTranslation, setSelectedTranslation] = useState<Translation>('KJV');

  // ✅ Controls the desktop settings panel on the right
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const style = {
    "--sidebar-width": "18rem",
  };

  return (
    <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          onSelectBook={setSelectedBook}
          onSelectChapter={setSelectedChapter}
        />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            
            <div className="flex items-center gap-2">
              {/* 📱 Mobile settings (Sheet stays the same) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    data-testid="button-settings-mobile"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <ToolsPanel
                    showStrongsNumbers={showStrongsNumbers}
                    showInterlinear={showInterlinear}
                    showNotes={showNotes}
                    fontSize={fontSize}
                    displayMode={displayMode}
                    selectedTranslation={selectedTranslation}
                    onToggleStrongsNumbers={setShowStrongsNumbers}
                    onToggleInterlinear={setShowInterlinear}
                    onToggleNotes={setShowNotes}
                    onFontSizeChange={setFontSize}
                    onDisplayModeChange={setDisplayMode}
                    onTranslationChange={setSelectedTranslation}
                  />
                </SheetContent>
              </Sheet>

              {/* 💻 Desktop Settings toggle button */}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setShowSettingsPanel(prev => !prev)}
                data-testid="button-settings-desktop"
              >
                <Settings className="h-4 w-4 mr-1" />
                {showSettingsPanel ? 'Hide settings' : 'Show settings'}
              </Button>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === 'light'
                  ? <Moon className="h-4 w-4" />
                  : <Sun className="h-4 w-4" />}
              </Button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <BibleReader
                book={selectedBook}
                chapter={selectedChapter}
                showStrongsNumbers={showStrongsNumbers}
                showInterlinear={showInterlinear}
                showNotes={showNotes}
                fontSize={fontSize}
                displayMode={displayMode}
                selectedTranslation={selectedTranslation}
              />
            </div>

            {/* 🧰 Desktop ToolsPanel – now toggleable */}
            {showSettingsPanel && (
              <div className="hidden md:block w-80 border-l overflow-auto">
                <ToolsPanel
                  showStrongsNumbers={showStrongsNumbers}
                  showInterlinear={showInterlinear}
                  showNotes={showNotes}
                  fontSize={fontSize}
                  displayMode={displayMode}
                  selectedTranslation={selectedTranslation}
                  onToggleStrongsNumbers={setShowStrongsNumbers}
                  onToggleInterlinear={setShowInterlinear}
                  onToggleNotes={setShowNotes}
                  onFontSizeChange={setFontSize}
                  onDisplayModeChange={setDisplayMode}
                  onTranslationChange={setSelectedTranslation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
