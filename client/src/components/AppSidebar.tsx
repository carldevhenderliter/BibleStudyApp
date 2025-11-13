import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Book, BookOpen } from "lucide-react";
import { bibleBooks } from "@/lib/bibleData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppSidebarProps {
  selectedBook: string;
  selectedChapter: number;
  onSelectBook: (book: string) => void;
  onSelectChapter: (chapter: number) => void;
}

export function AppSidebar({
  selectedBook,
  selectedChapter,
  onSelectBook,
  onSelectChapter,
}: AppSidebarProps) {
  const currentBook = bibleBooks.find(b => b.name === selectedBook);
  const testaments = {
    Old: bibleBooks.filter(b => b.testament === "Old"),
    New: bibleBooks.filter(b => b.testament === "New"),
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Bible Study</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <ScrollArea className="h-full">
          {Object.entries(testaments).map(([testament, books]) => (
            <SidebarGroup key={testament}>
              <SidebarGroupLabel>{testament} Testament</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {books.map((book) => (
                    <SidebarMenuItem key={book.name}>
                      <SidebarMenuButton
                        onClick={() => onSelectBook(book.name)}
                        isActive={selectedBook === book.name}
                        data-testid={`button-book-${book.name.toLowerCase()}`}
                      >
                        <Book className="h-4 w-4" />
                        <span>{book.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          {currentBook && (
            <SidebarGroup>
              <SidebarGroupLabel>Chapters</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="grid grid-cols-5 gap-1 p-2">
                  {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).slice(0, 25).map((chapter) => (
                    <button
                      key={chapter}
                      onClick={() => onSelectChapter(chapter)}
                      className={`h-8 rounded-md text-sm font-medium transition-colors hover-elevate ${
                        selectedChapter === chapter
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground'
                      }`}
                      data-testid={`button-chapter-${chapter}`}
                    >
                      {chapter}
                    </button>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
