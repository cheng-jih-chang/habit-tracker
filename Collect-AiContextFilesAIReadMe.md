# AI Context Collection README

Purpose:
This document tells future AI assistants how to give the user a one-paste PowerShell command for collecting project files into an AI context folder.

This project uses:

Collect-AiContextFiles.cmd (recommended wrapper)
Collect-AiContextFiles.ps1 (main logic; called by .cmd)

The user wants AI to answer file-request questions with a one-paste command that can be copied and pasted once.

Default on Windows: always recommend Collect-AiContextFiles.cmd so ExecutionPolicy does not block the run.

This README follows the user's one-copy-block preference: exactly one copyable block, no nested code blocks, and everything plain text when giving reusable command output.

============================================================
1. Repo root rule
============================================================

The repo root is the folder that contains:

package.json

Example repo root:

C:\Users\sunny\Project\habit-tracker

Important:
All file paths given by AI must be relative to this repo root.

Correct path examples:

src\App.jsx
src\hooks\useHabitValue.js
docs\RETURN.md
README.md

Do not give paths relative to:

C:\Users\sunny\Project\habit-tracker\src

Do not omit the leading src\ when the file is under src.

Do not use absolute paths unless the user specifically asks for absolute paths.

============================================================
2. Output folder rule
============================================================

Collect-AiContextFiles.cmd (via Collect-AiContextFiles.ps1) creates the output folder at the same level as:

package.json

Expected output:

C:\Users\sunny\Project\habit-tracker\AiContext-yyyyMMdd-HHmmss

Example:

C:\Users\sunny\Project\habit-tracker\AiContext-20260620-164500

The output folder must not be created inside:

C:\Users\sunny\Project\habit-tracker\src

The output folder must not use the first file path as its folder name.

============================================================
3. How AI should answer "which files do you need?"
============================================================

When the user asks which files are needed for debugging or review, AI should not only list files as bullets.

AI should output a one-paste command that the user can paste directly.

Required format (PowerShell terminal; use backtick for line continuation):

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\path\to\File1.jsx" `
"src\path\to\File2.js" `
"src\path\to\File3.jsx"

Required format (cmd.exe; use caret for line continuation):

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd ^
"src\path\to\File1.jsx" ^
"src\path\to\File2.js" ^
"src\path\to\File3.jsx"

Rules:
1. First line must be cd C:\Users\sunny\Project\habit-tracker
2. Second command must use .\Collect-AiContextFiles.cmd (not .ps1)
3. Every path must be wrapped in double quotes
4. Every path except the last one must end with the shell line-continuation character (backtick ` in PowerShell, caret ^ in cmd.exe)
5. The last path must not end with a line-continuation character
6. Paths must be relative to repo root (src\..., docs\..., README.md, etc.)
7. Do not use a markdown table
8. Do not only provide explanation
9. Give the smallest useful file set first
10. If more files are needed later, give a second command later

============================================================
4. One-copy-block response rule
============================================================

When providing a reusable command or this README-style content, AI should prefer exactly one fenced code block.

Do not use nested triple-backtick blocks inside the block.

Do not put separate code examples in additional fenced blocks.

Everything should be copyable in one drag/copy action.

Preferred AI output style:

One short sentence outside the block is acceptable only when necessary, but if the user asks for one-copy format, output only one fenced block.

============================================================
5. Standard command template
============================================================

AI should use this template:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\App.jsx" `
"src\firebase.js" `
"src\components\Login.jsx"

============================================================
6. Common context packs
============================================================

------------------------------------------------------------
6.1 App shell / Firebase sync / auth
------------------------------------------------------------

Use when diagnosing:

- login or logout problems
- habits not loading from Firestore
- real-time sync issues
- debounced write behavior
- CRUD not persisting

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\App.jsx" `
"src\firebase.js" `
"src\components\Login.jsx" `
"src\main.jsx"

------------------------------------------------------------
6.2 Main view / filters / group tree
------------------------------------------------------------

Use when diagnosing:

- filter buttons wrong or flickering
- collapsed state problems
- top-level group list wrong
- MainView Firestore UI persistence issues
- date navigation on main screen

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\views\MainView.jsx" `
"src\components\GroupTree.jsx" `
"src\components\GroupRow.jsx" `
"src\components\AddFilterModal.jsx"

------------------------------------------------------------
6.3 Habit row / add-edit form
------------------------------------------------------------

Use when diagnosing:

- habit create or edit form problems
- dropdown menu actions
- group vs habit item display
- delete or update item UI issues

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\components\HabitRow.jsx" `
"src\components\AddItemForm.jsx" `
"src\components\BottomBar.jsx"

------------------------------------------------------------
6.4 Progress evaluation / goals / leveling
------------------------------------------------------------

Use when diagnosing:

- daily / weekly / monthly goal calculation wrong
- completion status wrong
- minutes unit stored as seconds mismatch
- leveling or threshold logic wrong
- progress bar display wrong

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\components\evaluate.js" `
"src\utils\progress.js" `
"src\utils\habitValueAdapter.js" `
"src\hooks\useHabitValue.js" `
"src\components\ProgressBar.jsx" `
"src\components\HabitValueCalculator.jsx"

------------------------------------------------------------
6.5 Timer hooks
------------------------------------------------------------

Use when diagnosing:

- bound timer not syncing
- minute timer drift or stop issues
- timer value not writing to habit progress
- target-time habit value wrong

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\hooks\useBoundHabitTimer.js" `
"src\hooks\useSyncedBoundHabitTimer.js" `
"src\hooks\useMinuteTimer.js" `
"src\hooks\useHabitValueAtTarget.js" `
"src\utils\formatSec.js"

------------------------------------------------------------
6.6 Calendar view
------------------------------------------------------------

Use when diagnosing:

- weekly calendar display wrong
- date selection not reflected
- calendar icons or completion markers wrong

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\views\CalendarView.jsx" `
"src\components\evaluate.js" `
"src\utils\progress.js"

------------------------------------------------------------
6.7 Settings / import-export
------------------------------------------------------------

Use when diagnosing:

- JSON export or import problems
- settings panel UI issues
- data backup or restore failures

PowerShell command:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\views\SettingsView.jsx" `
"src\App.jsx"

============================================================
7. How AI should choose files
============================================================

If the problem is about auth or Firestore sync:
Use the App shell / Firebase sync pack first.

If the problem is about filters or main list layout:
Use the Main view / filters pack first.

If the problem is about creating or editing habits:
Use the Habit row / add-edit form pack first.

If the problem is about goals, completion, or leveling:
Use the Progress evaluation pack first.

If the problem is about timers:
Use the Timer hooks pack first.

If the problem is about the calendar:
Use the Calendar view pack first.

If the problem is about export/import:
Use the Settings pack first.

If unsure:
Start with the smallest relevant pack.
Do not request the entire project unless absolutely necessary.

============================================================
8. How AI should respond after reading logs or symptoms
============================================================

When diagnosing, AI should first identify which area failed:

Area 1: Auth / Firestore
- login
- onSnapshot load
- debounced setDoc writes

Area 2: MainView
- filters persistence
- group tree rendering
- date navigation

Area 3: Habit CRUD
- AddItemForm
- HabitRow actions

Area 4: Evaluation
- evaluate.js goal logic
- minutes stored as seconds
- leveling thresholds

Area 5: Timers
- bound timer sync
- progress updates from timer

Area 6: Calendar
- weekly visualization

Area 7: Settings
- JSON import/export

Then AI should request the smallest matching file pack using a one-paste Collect-AiContextFiles.cmd command.

============================================================
9. Important project-specific notes
============================================================

- Frontend: React 19 + Vite 7, Firebase Auth + Firestore.
- Habits live at Firestore path: users/{uid}/habits.
- MainView UI filters persist at: users/{uid}/ui/mainView.
- Habit writes in App.jsx use debounce (~900 ms); form save uses immediate write.
- For unit === 'minutes', progress is stored in SECONDS (see evaluate.js).
- Items can be type 'habit' or 'group'; groups have nested children.
- Frequency options: daily, weekly, monthly, yearly, life, none.
- localStorage also caches habit_items as a fallback mirror.

============================================================
10. Good AI answer example
============================================================

When the user asks:

Why is my weekly goal showing wrong completion?

AI should answer with:

cd C:\Users\sunny\Project\habit-tracker

.\Collect-AiContextFiles.cmd `
"src\components\evaluate.js" `
"src\utils\progress.js" `
"src\utils\habitValueAdapter.js" `
"src\hooks\useHabitValue.js" `
"src\components\ProgressBar.jsx"

============================================================
11. Bad AI answer example
============================================================

Do not answer like this:

You need these files:
- evaluate.js
- progress.js
- useHabitValue.js

This is bad because the user then has to manually locate and copy the files.

Always give the one-paste Collect-AiContextFiles.cmd command instead.

============================================================
12. Execution policy note
============================================================

Default recommendation:
Use Collect-AiContextFiles.cmd. It is a Windows batch wrapper that launches powershell.exe with -ExecutionPolicy Bypass for that process only. No global policy change and no administrator rights are required.

Why .cmd avoids the block:
Running .\Collect-AiContextFiles.ps1 directly is blocked when the system ExecutionPolicy disallows script files. Collect-AiContextFiles.cmd is not a PowerShell script, so the shell runs it normally. Inside the .cmd, powershell.exe -ExecutionPolicy Bypass -File ... applies bypass only to that child PowerShell process.

If the user insists on calling .ps1 directly (not recommended), they must bypass policy for that session or invocation:

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\Collect-AiContextFiles.ps1 "src\App.jsx"

Or:

powershell -NoProfile -ExecutionPolicy Bypass -File .\Collect-AiContextFiles.ps1 "src\App.jsx"

Do not ask the user to change machine-wide or user-wide ExecutionPolicy.
