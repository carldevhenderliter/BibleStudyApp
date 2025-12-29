import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { BibleReader } from "@/components/BibleReader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { Translation } from "@/lib/bibleData";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const clampFontSize = (value: number) => Math.min(40, Math.max(10, Math.round(value)));

  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);

  // Study settings
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(true);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showStrongsEnglishOnly, setShowStrongsEnglishOnly] = useState(false);
  const [hideAllEnglish, setHideAllEnglish] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [inkEnabled, setInkEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(17);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono" | "gentium">("serif");
  const [displayMode, setDisplayMode] = useState<"verse" | "book">("verse");
  const [selectedTranslation, setSelectedTranslation] =
    useState<Translation>("KJV");

  // Load saved reader settings once
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("reader-settings");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (typeof parsed.fontSize === "number") setFontSize(clampFontSize(parsed.fontSize));
      if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
      if (typeof parsed.showStrongsNumbers === "boolean") setShowStrongsNumbers(parsed.showStrongsNumbers);
      if (typeof parsed.showInterlinear === "boolean") setShowInterlinear(parsed.showInterlinear);
      if (typeof parsed.showStrongsEnglishOnly === "boolean") setShowStrongsEnglishOnly(parsed.showStrongsEnglishOnly);
      if (typeof parsed.hideAllEnglish === "boolean") setHideAllEnglish(parsed.hideAllEnglish);
      if (typeof parsed.showNotes === "boolean") setShowNotes(parsed.showNotes);
      if (typeof parsed.inkEnabled === "boolean") setInkEnabled(parsed.inkEnabled);
      if (parsed.displayMode === "verse" || parsed.displayMode === "book") setDisplayMode(parsed.displayMode);
      if (parsed.selectedTranslation) setSelectedTranslation(parsed.selectedTranslation);
    } catch (e) {
      console.warn("Failed to load saved reader settings", e);
    }
  }, []);

  // Persist reader settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      fontSize,
      fontFamily,
      showStrongsNumbers,
      showInterlinear,
      showStrongsEnglishOnly,
      hideAllEnglish,
      showNotes,
      inkEnabled,
      displayMode,
      selectedTranslation,
    };
    try {
      localStorage.setItem("reader-settings", JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save reader settings", e);
    }
  }, [
    fontSize,
    fontFamily,
    showStrongsNumbers,
    showInterlinear,
    showStrongsEnglishOnly,
    hideAllEnglish,
    showNotes,
    inkEnabled,
    displayMode,
    selectedTranslation,
  ]);

  const navigateTo = (
    book: string,
    chapter: number,
    opts?: { targetVerse?: number }
  ) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
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

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <BibleReader
                book={selectedBook}
                chapter={selectedChapter}
                showStrongsNumbers={showStrongsNumbers}
                showInterlinear={showInterlinear}
                showStrongsEnglishOnly={showStrongsEnglishOnly}
                hideAllEnglish={hideAllEnglish}
                showNotes={showNotes}
                inkEnabled={inkEnabled}
                onToggleInkEnabled={setInkEnabled}
                fontSize={fontSize}
                fontFamily={fontFamily}
                displayMode={displayMode}
                selectedTranslation={selectedTranslation}
                theme={theme}
                onToggleTheme={toggleTheme}
                onToggleStrongsNumbers={setShowStrongsNumbers}
                onToggleInterlinear={setShowInterlinear}
                onToggleStrongsEnglishOnly={setShowStrongsEnglishOnly}
                onToggleHideAllEnglish={setHideAllEnglish}
                onToggleNotes={setShowNotes}
                onFontSizeChange={(value) => setFontSize(clampFontSize(value))}
                onFontFamilyChange={setFontFamily}
                onDisplayModeChange={setDisplayMode}
                onTranslationChange={setSelectedTranslation}
                onNavigate={(book, chapter, verse) =>
                  navigateTo(book, chapter, { targetVerse: verse })
                }
              />
            </div>

          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
