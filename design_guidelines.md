# Bible Study App Design Guidelines

## Design Approach

**Selected System: Apple Human Interface Guidelines**
- Rationale: Content-first design philosophy perfect for long-form scripture reading
- Clean typography hierarchy for extended reading sessions
- Subtle, non-distracting interaction patterns ideal for study focus
- Minimal chrome to maximize content visibility

## Typography System

**Primary Font Stack:**
- Body Text (Scripture): Georgia or Charter serif (16-18px base, 1.7-1.8 line-height for readability)
- UI Elements: SF Pro or Inter (14-16px for controls)
- Notes: System sans-serif (15px, slightly condensed line-height)
- Strong's Numbers: Monospace font (12px, subtle treatment)

**Hierarchy:**
- Book Titles: 28px, semibold
- Chapter Numbers: 20px, medium weight
- Verse Numbers: 12px, lighter weight, inline with text
- Inline Notes: 15px, distinct visual separation from scripture
- Strong's Annotations: 11px, superscript style

## Layout System

**Spacing Primitives: Tailwind units 2, 4, 6, 8, 12**
- Use consistently: p-4, gap-6, mt-8, space-y-12
- Reading column: max-w-3xl centered for optimal line length
- Side panels (navigation): w-64 to w-80
- Margins around content: px-6 to px-12

**Layout Structure:**
```
[Sidebar Navigation] [Main Reading Pane] [Notes/Tools Panel]
     20-25%                50-55%              20-25%
```

Mobile: Stack vertically with bottom sheet for tools

## Component Library

**Navigation Sidebar:**
- Book list with expandable chapters
- Search input at top with icon
- Recent readings section
- Saved highlights quick access
- Compact, scannable list design

**Main Reading Pane:**
- Clean white/cream reading surface
- Verse numbers in left gutter (absolute positioned)
- Inline note insertion points between verses (+ icon on hover)
- Highlight overlay on text selection
- Strong's numbers as clickable superscript tags
- Interlinear text stacked below with subtle connecting lines

**Highlighting System:**
- 4-5 preset highlight colors (yellow, blue, green, pink, purple)
- Semi-transparent overlay (20-30% opacity)
- Color picker bar appears on text selection
- Persistent across sessions

**Inline Notes Component:**
- Expandable/collapsible card between verses
- Rich text editor (bold, italic, lists)
- Timestamp and verse reference auto-added
- Edit/delete controls
- Subtle background differentiation from scripture

**Tools Panel:**
- Toggle switches for Strong's numbers
- Toggle for interlinear view
- Font size slider (14-24px range)
- Line spacing controls
- Export/print options

**Interlinear Display:**
- English text on primary line
- Hebrew/Greek transliteration below in smaller, italicized text
- Word-by-word alignment
- Optional: literal translation on third line
- Subtle divider lines for visual organization

**Strong's Number Treatment:**
- Superscript blue numbers (G1234, H5678)
- Hover shows definition tooltip
- Click for expanded lexicon panel
- Non-intrusive when not in use

## Interaction Patterns

**Text Selection:**
- Highlight color palette appears above selection
- Note button appears in floating toolbar
- Copy/share options available

**Verse Navigation:**
- Click verse numbers for permalink
- Keyboard shortcuts (arrow keys for verses, page up/down for chapters)
- Smooth scroll to verse from search results

**Panel Behavior:**
- Collapsible sidebars to maximize reading space
- Resizable panels with drag handles
- State persistence in localStorage

**Note Creation:**
- Click between verses to insert note point
- Inline editing with auto-save
- Attach to specific verse or verse range

## Reading Experience Optimization

**Focus Mode:**
- Hide all panels except main reading pane
- Distraction-free reading
- Press 'F' to toggle

**Progressive Disclosure:**
- Strong's numbers hidden by default
- Interlinear view opt-in
- Notes collapsed to indicators until expanded

**Performance:**
- Lazy load chapters (render visible + adjacent)
- Virtualize long chapter lists
- Cache frequently accessed books

## Images

**No hero image required** - This is a utility application focused on content immersion. Any imagery should be:
- Decorative accents only (subtle background textures)
- Icons for navigation (book icons, bookmark indicators)
- Avoid distracting visual elements that compete with scripture text

## Mobile Adaptations

- Single column layout
- Bottom sheet for tools (swipe up)
- Sticky chapter/verse header
- Tap verse for note/highlight menu
- Gesture-based navigation (swipe for chapters)