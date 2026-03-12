# Responsive Design Audit — Alumni Network (React + Tailwind CSS)

> **Scope:** 23 files in `client/src/`. Every `className` and inline style checked against 12 focus categories.
> **Breakpoints used by project:** sm=640px (Tailwind default), md=768px, lg=1024px, xl=1280px. CSS overrides: xs=320px, sm=480px (custom in index.css but NOT what Tailwind uses).

---

## Table of Contents

| # | File | Issues |
|---|------|--------|
| 1 | [Jobs.tsx](#1-jobstsx) | 5 |
| 2 | [JobDetail.tsx](#2-jobdetailtsx) | 3 |
| 3 | [Profile.tsx](#3-profiletsx) | 6 (2 already fixed) |
| 4 | [Gallery.tsx](#4-gallerytsx) | 5 |
| 5 | [NewsList.tsx](#5-newslisttsx) | 4 |
| 6 | [NewsDetail.tsx](#6-newsdetailtsx) | 2 |
| 7 | [PostJob.tsx](#7-postjobtsx) | 3 |
| 8 | [Messages.tsx](#8-messagestsx) | 2 |
| 9 | [Events.tsx](#9-eventstsx) | 1 |
| 10 | [Footer.tsx](#10-footertsx) | 2 |
| 11 | [Saved.tsx](#11-savedtsx) | 2 |
| 12 | [ShareModal.tsx](#12-sharemodaltsx) | 1 |
| 13 | [index.css](#13-indexcss) | 1 |
| 14 | [Login.tsx](#14-logintsx) | 1 |
| 15 | [Landing.tsx](#15-landingtsx) | 1 |
| 16 | [Feed.tsx](#16-feedtsx) | 0 (well done) |
| 17 | [Settings.tsx](#17-settingstsx) | 0 (well done) |
| 18 | [Notifications.tsx](#18-notificationstsx) | 0 |
| 19 | [Directory.tsx](#19-directorytsx) | 0 |
| 20 | [EventDetail.tsx](#20-eventdetailtsx) | 0 |
| 21 | [Landing.tsx (general)](#21-landingtsx-general) | 0 |
| 22 | [Login.tsx (general)](#22-logintsx-general) | 0 |
| 23 | [Register.tsx](#23-registertsx) | 0 |
| 24 | [Navbar.tsx](#24-navbartsx) | 0 |
| 25 | [Layout.tsx](#25-layouttsx) | 0 |

**Total issues found: 40** (35 original + 5 new findings in v2 update)

> ⚠️ **v2 Update Notes:** Issues 3.1 and 3.2 in Profile.tsx are marked as **ALREADY FIXED** — the current code already includes responsive variants. 5 new issues added (Login OTP overflow, Profile crop SVG, Saved sidebar, JobDetail wrapping, Landing administration).

---

## 1. Jobs.tsx

### Issue 1.1 — "Jobs I Applied" tab button lacks responsive sizing
**File:** `src/pages/Jobs.tsx` **Line:** 284  
**Current code:**
```tsx
className={`px-6 py-2 text-sm font-medium rounded-lg shadow-sm transition-all ${...}`}
```
**Problem:** The "All Jobs" tab at line 274 uses responsive classes (`px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm`), but this tab uses hardcoded `px-6 py-2 text-sm`. On screens < 640px, this button will be disproportionately large compared to "All Jobs" and may cause horizontal overflow in the scrollable tab bar.  
**Affected:** < 640px (phones)  
**Fix:**
```tsx
className={`flex-shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all ${...}`}
```

### Issue 1.2 — "Jobs I Posted" tab button lacks responsive sizing
**File:** `src/pages/Jobs.tsx` **Line:** 294  
**Current code:**
```tsx
className={`px-6 py-2 text-sm font-medium rounded-lg shadow-sm transition-all ${...}`}
```
**Problem:** Same as Issue 1.1. Inconsistent with the responsive "All Jobs" button at line 274.  
**Affected:** < 640px  
**Fix:**
```tsx
className={`flex-shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all ${...}`}
```

### Issue 1.3 — Job creation modal: 2-column grid doesn't collapse
**File:** `src/pages/Jobs.tsx` **Line:** 324  
**Current code:**
```tsx
<div className="grid grid-cols-2 gap-4">
```
**Problem:** Inside the job creation modal (`max-w-2xl`), this grid has two side-by-side fields (Location, Job Type) with no responsive breakpoint. On phones (< 480px), each column is ~200px wide, making inputs very cramped and hard to tap/type.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Issue 1.4 — Job creation modal: 3-column grid doesn't collapse
**File:** `src/pages/Jobs.tsx` **Line:** 332  
**Current code:**
```tsx
<div className="grid grid-cols-3 gap-4">
```
**Problem:** Three fields (Currency, Min Salary, Max Salary) in 3 columns. On a 375px phone inside a modal with padding, each column is barely 100px. The currency dropdown and salary inputs will be nearly unusable.  
**Affected:** < 768px  
**Fix:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
```

### Issue 1.5 — Filter sidebar always visible on mobile (no collapse)
**File:** `src/pages/Jobs.tsx` **Line:** 476  
**Current code:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
```
**Problem:** The filter sidebar (containing type checkboxes, location select, salary filters, experience filters — lines 478–739) renders as a full-width block above the job listings on mobile. This pushes the actual job list far down the page (requires scrolling past ~500px of filters). Unlike Events.tsx which hides the sidebar on mobile with `hidden lg:block`, here the sidebar is always visible.  
**Affected:** < 1024px (tablets and phones)  
**Fix:** Add a mobile filter toggle:
```tsx
// Add state: const [showFilters, setShowFilters] = useState(false);
// Wrap the sidebar aside with:
<aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
// Add a toggle button above the job list visible on lg:hidden:
<button onClick={() => setShowFilters(!showFilters)} className="lg:hidden mb-3 flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm">
    <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
</button>
```

---

## 2. JobDetail.tsx

### Issue 2.1 — Card padding not responsive
**File:** `src/pages/JobDetail.tsx` **Line:** 183  
**Current code:**
```tsx
className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-6"
```
**Problem:** `p-6` (24px) is generous padding on a 320px phone screen, consuming ~15% of available width.  
**Affected:** < 640px  
**Fix:**
```tsx
className="... p-4 sm:p-6"
```

### Issue 2.2 — Job title text size not responsive
**File:** `src/pages/JobDetail.tsx` **Line:** 215  
**Current code:**
```tsx
<h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{job.title}</h1>
```
**Problem:** `text-2xl` (1.5rem / 24px) is the only size. For long job titles like "Senior Full-Stack Software Development Engineer" it can force two lines on phones. A smaller base with scaling up is better.  
**Affected:** < 640px  
**Fix:**
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1">{job.title}</h1>
```

### Issue 2.3 — Action bar may overflow with many buttons
**File:** `src/pages/JobDetail.tsx` **Line:** 223  
**Current code:**
```tsx
<div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
```
**Problem:** This flex row contains Apply button + Save button + Share button + potentially admin Edit/Delete buttons. On narrow screens, the row doesn't wrap.  
**Affected:** < 480px (especially with admin buttons)  
**Fix:**
```tsx
<div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
```

---

## 3. Profile.tsx

### Issue 3.1 — ~~Cover photo height not responsive~~ ✅ ALREADY FIXED
**File:** `src/pages/Profile.tsx` **Line:** 331  
**Status:** The current code already uses responsive heights: `h-[180px] sm:h-[230px] md:h-[270px]`. No action needed.

### Issue 3.2 — ~~Avatar dimensions not responsive~~ ✅ ALREADY FIXED
**File:** `src/pages/Profile.tsx` **Line:** 360  
**Status:** The current code already uses responsive sizes: `w-[100px] h-[100px] sm:w-[140px] sm:h-[140px]`. No action needed.

### Issue 3.3 — Profile name text not responsive
**File:** `src/pages/Profile.tsx` **Line:** 381  
**Current code:**
```tsx
<h1 className="text-2xl font-bold text-[var(--text-primary)]">{profileUser?.name || 'Alumni User'}</h1>
```
**Problem:** Fixed `text-2xl` title. Long names may wrap awkwardly.  
**Affected:** < 640px  
**Fix:**
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{profileUser?.name || 'Alumni User'}</h1>
```

### Issue 3.4 — Crop modal canvas height not responsive
**File:** `src/pages/Profile.tsx` **Line:** 1070  
**Current code:**
```tsx
className="relative h-[400px] bg-black overflow-hidden select-none"
```
**Problem:** 400px canvas height inside a `max-w-2xl` modal. On short phones (landscape or short viewports), this overflows the screen and the modal action buttons (Cancel/Apply) become unreachable.  
**Affected:** < 640px height, landscape phones  
**Fix:**
```tsx
className="relative h-[250px] sm:h-[320px] md:h-[400px] bg-black overflow-hidden select-none"
```

### Issue 3.5 — Edit/Save profile button padding not responsive
**File:** `src/pages/Profile.tsx` **Line:** 448  
**Current code:**
```tsx
className="px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold shadow-sm shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 transition-all"
```
**Problem:** `px-6` is wide padding for a button on mobile where horizontal space is tight.  
**Affected:** < 480px  
**Fix:**
```tsx
className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-[var(--accent)] text-[var(--bg-primary)] font-semibold shadow-sm shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 transition-all"
```

### Issue 3.6 — 🆕 Crop modal SVG mask uses hardcoded pixel dimensions
**File:** `src/pages/Profile.tsx` **Lines:** ~1085–1095  
**Current code:**
```tsx
{cropType === 'avatar' ? (
    <circle cx="50%" cy="50%" r="150" fill="black" />
) : (
    <rect x="50%" y="50%" width="600" height="300" transform="translate(-300, -150)" fill="black" />
)}
```
**Problem:** The crop overlay mask uses hardcoded pixel values: `r="150"` (300px diameter circle) and `width="600" height="300"` rectangle. On a 320px phone, the modal content area is ~280px wide, so the 300px circle extends beyond the container boundaries and the 600px rectangle is more than double the available width. While the SVG clips overflow, the visual crop region doesn't match what's actually visible, confusing users about what area will be cropped.  
**Affected:** < 640px  
**Fix:** Use percentage-based values or calculate from container width:
```tsx
{cropType === 'avatar' ? (
    <circle cx="50%" cy="50%" r="40%" fill="black" />
) : (
    <rect x="10%" y="25%" width="80%" height="50%" fill="black" />
)}
```
Or alternatively, track container width with a ref and compute pixel values dynamically.

---

## 4. Gallery.tsx

### Issue 4.1 — Header card padding not responsive
**File:** `src/pages/Gallery.tsx` **Line:** 238  
**Current code:**
```tsx
className="... p-6 mb-8 shadow-md shadow-black/5"
```
**Problem:** `p-6 mb-8` are large on phones. 24px padding + 32px bottom margin wastes vertical space.  
**Affected:** < 640px  
**Fix:**
```tsx
className="... p-4 sm:p-6 mb-4 sm:mb-8 shadow-md shadow-black/5"
```

### Issue 4.2 — Page container vertical padding not responsive
**File:** `src/pages/Gallery.tsx` **Line:** 233  
**Current code:**
```tsx
<div className="max-w-[1400px] mx-auto px-4 py-8">
```
**Problem:** `py-8` (32px top + bottom) above the header card. Combined with Issue 4.1, the gallery header region takes ~120px before any content.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-8">
```

### Issue 4.3 — List view thumbnail has fixed dimensions
**File:** `src/pages/Gallery.tsx` **Line:** 574  
**Current code:**
```tsx
<div className="w-40 h-28 overflow-hidden flex-shrink-0 relative">
```
**Problem:** `w-40` = 160px. On a 320px phone with p-5 (20px x 2) padding inside a card with a flex row, the text content gets only ~100px. The image dominates the row.  
**Affected:** < 480px  
**Fix:**
```tsx
<div className="w-24 sm:w-40 h-20 sm:h-28 overflow-hidden flex-shrink-0 relative">
```

### Issue 4.4 — "No albums yet" heading not responsive
**File:** `src/pages/Gallery.tsx` **Line:** 352  
**Current code:**
```tsx
<h3 className="text-2xl font-bold text-[var(--text-primary)]">No albums yet</h3>
```
**Affected:** < 640px  
**Fix:**
```tsx
<h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">No albums yet</h3>
```

### Issue 4.5 — "Empty Album" heading not responsive
**File:** `src/pages/Gallery.tsx` **Line:** 456  
**Current code:**
```tsx
<h3 className="text-2xl font-bold text-[var(--text-primary)]">Empty Album</h3>
```
**Affected:** < 640px  
**Fix:**
```tsx
<h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Empty Album</h3>
```

---

## 5. NewsList.tsx

### Issue 5.1 — Container padding not responsive
**File:** `src/pages/NewsList.tsx` **Line:** 57  
**Current code:**
```tsx
<div className="max-w-4xl mx-auto p-6">
```
**Problem:** `p-6` applies 24px padding on all sides including left/right. On a 375px phone, content width shrinks to 327px. Should use horizontal-specific responsive padding.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
```

### Issue 5.2 — Page title not responsive
**File:** `src/pages/NewsList.tsx` **Line:** 58  
**Current code:**
```tsx
<h1 className="text-2xl font-semibold mb-4">MIC College of Technology — News</h1>
```
**Problem:** `text-2xl` for a long title. On narrow screens it wraps to 3+ lines.  
**Affected:** < 640px  
**Fix:**
```tsx
<h1 className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-4">MIC College of Technology — News</h1>
```

### Issue 5.3 — News card flex doesn't stack on mobile
**File:** `src/pages/NewsList.tsx` **Line:** 62  
**Current code:**
```tsx
<div className="flex gap-4">
```
**Problem:** Each news card is a horizontal flex row with image + text. On phones (< 480px), the fixed `w-28` image and text compete for the ~200px remaining width. The layout should stack vertically on mobile.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
```

### Issue 5.4 — News card image has fixed dimensions
**File:** `src/pages/NewsList.tsx` **Line:** 63  
**Current code:**
```tsx
className="w-28 h-20 object-cover rounded-lg"
// and the fallback:
className="w-28 h-20 bg-[var(--bg-tertiary)] rounded-lg"
```
**Problem:** `w-28` (112px) is fixed width. With Issue 5.3's fix to stack vertically on mobile, the image should be full-width on mobile.  
**Affected:** < 640px  
**Fix:**
```tsx
className="w-full sm:w-28 h-40 sm:h-20 object-cover rounded-lg"
// fallback:
className="w-full sm:w-28 h-40 sm:h-20 bg-[var(--bg-tertiary)] rounded-lg"
```

---

## 6. NewsDetail.tsx

### Issue 6.1 — Container padding not responsive
**File:** `src/pages/NewsDetail.tsx` (approx. line 30)  
**Current code:**
```tsx
<div className="max-w-3xl mx-auto p-6">
```
**Problem:** Same as NewsList issue. `p-6` is too much horizontal padding on mobile.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
```

### Issue 6.2 — Article title not responsive
**File:** `src/pages/NewsDetail.tsx` (approx. line 35)  
**Current code:**
```tsx
<h1 className="text-2xl font-semibold mb-3">
```
**Affected:** < 640px  
**Fix:**
```tsx
<h1 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
```

---

## 7. PostJob.tsx

### Issue 7.1 — Step 1 salary grid doesn't collapse
**File:** `src/pages/PostJob.tsx` **Line:** 279  
**Current code:**
```tsx
<div className="grid grid-cols-2 gap-3">
```
**Problem:** Two currency/salary fields side-by-side inside `max-w-3xl`. On phones, each field gets ~150px width, barely fitting the input + labels.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

### Issue 7.2 — Step 2 grid doesn't collapse
**File:** `src/pages/PostJob.tsx` **Line:** 465  
**Current code:**
```tsx
<div className="grid grid-cols-2 gap-3 mt-2">
```
**Problem:** Application requirement fields in 2 columns on mobile.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
```

### Issue 7.3 — Step form container padding not responsive
**File:** `src/pages/PostJob.tsx` **Line:** 188  
**Current code:**
```tsx
<div className="bg-[var(--bg-secondary)] shadow-sm p-6">
```
**Problem:** `p-6` without responsive variant. Line 154 correctly uses `p-4 sm:p-6`, but the main form container doesn't.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="bg-[var(--bg-secondary)] shadow-sm p-4 sm:p-6">
```

---

## 8. Messages.tsx

### Issue 8.1 — Message media attachment max-width is small on desktop
**File:** `src/pages/Messages.tsx` **Line:** 924  
**Current code:**
```tsx
<div key={i} className="max-w-[280px]">
```
**Problem:** Media (images/videos) inside message bubbles are capped at 280px. On desktop with a 900px+ chat area, images look oddly tiny and don't scale up. On mobile 280px is fine.  
**Affected:** > 1024px (desktop) — images don't scale up  
**Fix:**
```tsx
<div key={i} className="max-w-[280px] md:max-w-[360px] lg:max-w-[400px]">
```

### Issue 8.2 — Bottom padding for mobile bottom nav not accounted for
**File:** `src/pages/Messages.tsx` **Line:** 575  
**Current code:**
```tsx
className="... h-[calc(100vh-8rem)] sm:h-[calc(100vh-120px)] ..."
```
**Problem:** The Navbar renders a fixed bottom tab bar on mobile (`h-14` = 56px). The messages page height calc uses `100vh-8rem` (128px), which only accounts for the top navbar. The mobile bottom nav adds another 56px, so the message input area may be hidden behind the bottom tab bar.  
**Affected:** Mobile (< 768px) when bottom nav is present  
**Fix:**
```tsx
className="... h-[calc(100vh-8rem-3.5rem)] sm:h-[calc(100vh-8rem)] md:h-[calc(100vh-120px)] ..."
```
Or use the CSS utility `.pb-mobile-nav` that already exists in index.css.

---

## 9. Events.tsx

### Issue 9.1 — Create event modal grid doesn't collapse
**File:** `src/pages/Events.tsx` **Line:** 405  
**Current code:**
```tsx
<div className="grid grid-cols-2 gap-4">
```
**Problem:** Start date + End date fields in the create event modal (`max-w-lg`) are in 2 columns without a responsive breakpoint. On phones, the modal is nearly full-width, and each date input gets ~160px — functional but cramped.  
**Affected:** < 640px  
**Fix:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

---

## 10. Footer.tsx

### Issue 10.1 — Footer top padding not responsive
**File:** `src/components/layout/Footer.tsx` **Line:** 68  
**Current code:**
```tsx
<div className="max-w-6xl mx-auto px-6 py-20 relative">
```
**Problem:** `py-20` = 80px top + bottom padding. On mobile, the footer region is already long with stacked columns; 80px vertical padding wastes screen space.  
**Affected:** < 768px  
**Fix:**
```tsx
<div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-20 relative">
```

### Issue 10.2 — Grid bottom margin not responsive
**File:** `src/components/layout/Footer.tsx` **Line:** 72  
**Current code:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-12 mb-16">
```
**Problem:** `mb-16` (64px) is excessive on mobile where the footer is already long.  
**Affected:** < 768px  
**Fix:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-12 mb-8 md:mb-16">
```

---

## 11. Saved.tsx

### Issue 11.1 — Grid view 2-column may be tight on very narrow screens
**File:** `src/pages/Saved.tsx` **Line:** ~399  
**Current code:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
```
**Problem:** On a 320px phone with `px-4` container padding, each grid item in 2 columns is about 136px wide. The aspect-square items are 136x136px which is workable but tight for the hover overlay text and action buttons.  
**Affected:** 320px width devices  
**Fix (minor improvement):**
```tsx
<div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-3">
```

### Issue 11.2 — 🆕 Collections sidebar always visible on mobile, pushes content down
**File:** `src/pages/Saved.tsx` **Line:** ~263  
**Current code:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
    <aside className="lg:sticky lg:top-[76px] lg:h-fit">
```
**Problem:** Same pattern as Jobs.tsx Issue 1.5. The collections sidebar (containing "All Saved", custom collections list, and "New Collection" button) renders as a full-width block above the saved posts on mobile. Users must scroll past the entire collections panel before seeing any saved content. If there are many collections, this becomes a significant UX issue.  
**Affected:** < 1024px (tablets and phones)  
**Fix:** Add a mobile toggle or collapse pattern:
```tsx
// Add state: const [showSidebar, setShowSidebar] = useState(false);
<aside className={`${showSidebar ? 'block' : 'hidden'} lg:block lg:sticky lg:top-[76px] lg:h-fit`}>
// Add mobile toggle above main content:
<button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden mb-3 flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm">
    <Bookmark size={16} /> {showSidebar ? 'Hide Collections' : 'Show Collections'}
</button>
```

---

## 12. ShareModal.tsx

### Issue 12.1 — Share options 2-column grid truncates text on narrow phones
**File:** `src/components/ShareModal.tsx` **Line:** 73  
**Current code:**
```tsx
<div className="grid grid-cols-2 gap-2">
```
**Problem:** Each share button has icon + text like "X (formerly Twitter)". In a 2-column grid inside a `max-w-md` modal on a 320px phone (modal ~ 290px content area), each button gets ~140px. The text "X (formerly Twitter)" truncates or wraps poorly.  
**Affected:** < 400px  
**Fix:**
```tsx
<div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
```

---

## 13. index.css

### Issue 13.1 — Custom breakpoint mismatch with Tailwind
**File:** `src/index.css` **Lines:** 30–31  
**Current code:**
```css
--breakpoint-xs: 320px;
--breakpoint-sm: 480px;
```
**Problem:** The custom `--breakpoint-sm: 480px` declaration in the `@theme` block overrides Tailwind's default `sm` breakpoint (640px). This means every `sm:` utility in the entire codebase activates at **480px instead of 640px**. This creates a gap between 480px–640px where developers *think* they're targeting 640px+ but actually target 480px+. Some responsive patterns may look correct on 640px but break between 480–640px because `sm:` kicks in too early.  
**Affected:** 480px–640px range on all pages  
**Fix:** Either:
- **Option A** (recommended): Remove the override to preserve Tailwind defaults:
  ```css
  /* Remove these lines or rename them: */
  /* --breakpoint-xs: 320px; */
  /* --breakpoint-sm: 480px; */
  ```
- **Option B**: Audit all `sm:` usages to ensure they work at 480px, and document the custom breakpoints clearly.

---

## 14. Login.tsx

### Issue 14.1 — 🆕 OTP input boxes overflow horizontally on mobile
**File:** `src/pages/Login.tsx` **Lines:** ~310–328  
**Current code:**
```tsx
<div className="flex justify-center gap-2">
    {otpDigits.map((digit, i) => (
        <input
            ...
            className="w-12 h-14 text-center text-xl font-bold bg-[var(--bg-tertiary)] border-2 ..."
        />
    ))}
</div>
```
**Problem:** 6 OTP input boxes at `w-12` (48px) each + 5 × `gap-2` (8px) = **328px** total width. On a 320px phone:
- Container: `max-w-[400px]` → capped at screen width = 320px
- Container padding: `px-4` = 32px → available = 288px
- Card padding: `p-6` = 48px → available = **240px**

The 328px of OTP inputs overflows the 240px available space, causing horizontal scroll on the login card. On a 375px phone (iPhone SE), available space is ~295px — still overflows.  
**Affected:** < 480px (all phones)  
**Severity:** 🔴 HIGH — breaks the login flow on mobile  
**Fix:**
```tsx
<div className="flex justify-center gap-1.5 sm:gap-2">
    {otpDigits.map((digit, i) => (
        <input
            ...
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-[var(--bg-tertiary)] border-2 ..."
        />
    ))}
</div>
```
This gives: 6 × 40px + 5 × 6px = **270px** — fits within 288px on a 320px phone.

---

## 15. Landing.tsx

### Issue 15.1 — 🆕 Administration list items may truncate on narrow screens
**File:** `src/pages/Landing.tsx` **Lines:** ~210–218  
**Current code:**
```tsx
<li key={i} className={`flex justify-between items-center${...}`}>
    <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
    <span className="text-sm text-[var(--text-secondary)]">{m.designation}</span>
</li>
```
**Problem:** The `flex justify-between items-center` layout places name and designation on opposite ends. On narrow screens (< 400px), if a person has a long name like "Dr. Venkata Ramana Reddy" and a long designation like "Associate Professor & HOD", the two spans compete for space with no gap or wrap. Text overlaps or gets squished since neither span has `min-w-0` or `truncate`.  
**Affected:** < 480px  
**Severity:** 🟡 MEDIUM  
**Fix:**
```tsx
<li key={i} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-4${...}`}>
    <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
    <span className="text-sm text-[var(--text-secondary)] sm:text-right sm:flex-shrink-0">{m.designation}</span>
</li>
```

---

## 16. Feed.tsx
✅ **Well done.** The 3-column `lg:grid-cols-[220px_1fr_280px]` layout collapses to single column on mobile. Left sidebar hidden via `hidden lg:block`, mobile filter bar shown via `lg:hidden`. Post modals use `w-full max-w-[600px]`. Media uses `max-h-[480px]` which is reasonable. No significant responsive issues found.

## 17. Settings.tsx
✅ **Well done.** Desktop sidebar (`hidden lg:block w-[300px]`) vs mobile horizontal tabs (`lg:hidden`). Theme buttons use `flex-1`. All spacing is reasonable.

## 18. Notifications.tsx
✅ No issues. Simple `max-w-[600px] mx-auto` centered layout.

## 19. Directory.tsx
✅ Good responsive patterns: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, search bar `flex-col sm:flex-row`.

## 20. EventDetail.tsx
✅ Banner heights are responsive: `h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px]`. Title uses `text-2xl md:text-3xl lg:text-4xl`. Edit/delete modals properly sized.

## 21. Landing.tsx (general)
✅ Delegates entirely to landing sub-components (Hero, StatsBar, etc.). The page itself is a simple `min-h-screen` wrapper. *(See Issue 15.1 for the administration section list item issue.)*

## 22. Login.tsx (general)
✅ Excellent responsive design for the password login flow. Nearly every property has `sm:` variants: padding, text sizes, button sizes, input sizes. Uses `max-w-[400px] sm:max-w-[440px]`. *(See Issue 14.1 for the OTP digit input overflow.)*

## 23. Register.tsx
✅ Good responsive design. Step indicator labels hidden on mobile (`hidden sm:inline`). Role selector uses `grid-cols-1 sm:grid-cols-3`. Form container `p-6 sm:p-8`. Academic fields `grid-cols-1 sm:grid-cols-2`.

## 24. Navbar.tsx
✅ Well-structured responsive navigation. Desktop nav hidden on mobile (`hidden md:flex`). Mobile controls visible (`flex md:hidden`). Mobile slide-out menu limited to `w-[280px] max-w-[85vw]`. Mobile bottom tab bar with `h-14` and `safe-area-inset-bottom`. Logo text hidden on mobile (`hidden sm:block`).

## 25. Layout.tsx
✅ Clean wrapper: `flex flex-col min-h-screen`, `pt-14` for fixed navbar offset.

---

## Summary of Severity

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 High | 6 | Causes usability problems on phones (Jobs filter sidebar, Login OTP overflow, grid-cols-2/3 in modals, Messages bottom nav overlap, breakpoint mismatch) |
| 🟡 Medium | 18 | Non-responsive text sizes, padding, dimensions, and sidebars that look bad but don't break functionality |
| 🟢 Low | 14 | Minor improvements for 320px screens or aesthetic tweaks |
| ✅ Fixed | 2 | Profile.tsx issues 3.1 and 3.2 (cover photo + avatar) already have responsive variants in current code |

### High Priority Fixes (do these first):
1. **Jobs.tsx L476** — Hide filter sidebar on mobile, add toggle button
2. **Login.tsx L310** — 🆕 OTP digit inputs overflow on phones ≤ 480px
3. **Jobs.tsx L324, L332** — Collapse modal grids on mobile
4. **Messages.tsx L575** — Account for mobile bottom nav in height calculation
5. **index.css L30-31** — Fix `--breakpoint-sm` mismatch with Tailwind default
6. **PostJob.tsx L279, L465** — Collapse salary/requirement grids on mobile

### Medium Priority:
- All `text-2xl` → `text-xl sm:text-2xl` fixes (Profile, JobDetail, Gallery, NewsList, NewsDetail)
- All `p-6` → `p-4 sm:p-6` fixes (JobDetail, Gallery, PostJob, NewsList, NewsDetail, Footer)
- **Saved.tsx L263** — 🆕 Collections sidebar always visible on mobile (add toggle)
- **Profile.tsx L1085** — 🆕 Crop modal SVG mask hardcoded pixels (use percentages)
- **Landing.tsx L210** — 🆕 Administration list items overlapping on narrow screens
- Profile button padding scaling (Profile L448)
- Footer padding reduction for mobile

### Low Priority:
- Tab button consistency (Jobs L284, L294)
- Saved grid on 320px screens
- ShareModal grid on 320px screens
- Gallery list-view thumbnail sizing
- Gallery empty state headings
