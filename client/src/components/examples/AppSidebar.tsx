import { useState } from 'react';
import { AppSidebar } from '../AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(1);

  const style = {
    "--sidebar-width": "20rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          onSelectBook={setSelectedBook}
          onSelectChapter={setSelectedChapter}
        />
        <div className="flex-1 p-8">
          <h2 className="text-2xl font-semibold mb-4">Sidebar Example</h2>
          <p className="text-muted-foreground">
            Currently viewing: {selectedBook} Chapter {selectedChapter}
          </p>
        </div>
      </div>
    </SidebarProvider>
  );
}
