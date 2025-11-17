import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { BibleReader } from "@/components/BibleReader";
import { ToolsPanel } from "@/components/ToolsPanel";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Settings, ArrowLeft, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Translation } from "@/lib/bibleData";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type Location = {
  book: string;
  chapter: number;
  verse?: number;
};

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);

  // Strong’s ON by default
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(true);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [displayMode, setDisplayMode] = useState<"verse" | "book">("verse");
  const [selectedTranslation, setSelectedTranslation] =
    useState<Translation>("KJV");

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Simple history for back/forward
  const [history, setHistory] = useState<Location[]>([
    { book: "John", chapter: 1 },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = (
    book: string,
    chapter: number,
    opts?: { fromHistory?: boolean; targetVerse?: number }
  ) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);

    if (!opts?.fromHistory) {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        const last = trimmed[trimmed.length - 1];

        if (last && last.book === book && last.chapter === chapter) {
          return trimmed;
        }

        const next: Location[] = [
          ...trimmed,
          { book, chapter, verse: opts?.targetVerse },
        ];
        setHistoryIndex(next.length - 1);
        return next;
      });
    }
  };

  const goBack = () => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    setHistoryIndex(newIndex);
    navigateTo(entry.book, entry.chapter, {
      fromHistory: true,
      targetVerse: entry.verse,
    });
  };

  const goForward = () => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    setHistoryIndex(newIndex);
    navigateTo(entry.book, entry.chapter, {
      fromHistory: true,
      targetVerse: entry.verse,
    });
  };

  const style = {
    "--sidebar-width": "18rem",
  };

  return (
    <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          onSelectBook={(book) => navigateTo(book, selectedChapter)}
          onSelectChapter={(chapter) => navigateTo(selectedBook, chapter)}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />

              {/* Back / Forward buttons */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                disabled={!canGoBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goForward}
                disabled={!canGoForward}
                aria-label="Forward"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile settings */}
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

              {/* Desktop Settings toggle */}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setShowSettingsPanel((prev) => !prev)}
                data-testid="button-settings-desktop"
              >
                <Settings className="h-4 w-4 mr-1" />
                {showSettingsPanel ? "Hide settings" : "Show settings"}
              </Button>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
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
                // 👉 let BibleReader (notes) navigate between books/chapters
                onNavigate={(book, chapter, verse) =>
                  navigateTo(book, chapter, { targetVerse: verse })
                }
              />
            </div>

            {/* Desktop ToolsPanel – toggleable */}
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
