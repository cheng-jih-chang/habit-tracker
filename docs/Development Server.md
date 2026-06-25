# Habit Tracker (React + Vite + Firebase) — Package / Build / Run (Terminal Only)

This note shows how to **install, run, build, and package** your Habit Tracker project using **terminal only** (no GUI).

---

## 0. Install Node.js (Terminal Only)

### Windows (PowerShell as Administrator)

```bash
winget install OpenJS.NodeJS.LTS
```

Verify:

```bash
node -v
npm.cmd -v
```

You should see version numbers (example: v20.x.x / 10.x.x).

---

## 1. Go to Project Folder

```bash
cd D:\Project\habit-tracker
```

---

## 2. Install Dependencies

```bash
npm.cmd install
```

This installs React, Vite, Firebase, and all packages in `package.json`.

---

## 3. Firebase Environment Setup (CLI)

If `.env` does not exist:

```bash
notepad .env
```

Paste your Firebase config:

```env
VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxx
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx
```

Save and close.

Restart dev server after editing `.env`.

---

## 4. Run Development Server

```bash
npm.cmd run dev
```

Output example:

```
VITE ready
Local: http://localhost:5173
```

Open browser:

```
http://localhost:5173
```

---

## 5. Build / Package Production Version

```bash
npm run build
```

After build completes, a new folder appears:

```
dist/
```

This folder is your **packaged production app** (compiled React + optimized Vite).

Structure:

```
dist/
 ├─ index.html
 ├─ assets/
 ├─ js/css files
```

You can deploy or run this without source code.

---

## 6. Preview Production Build (Local Test)

```bash
npm run preview
```

Open:

```
http://localhost:4173
```

This simulates real production environment.

---

## 7. Package as ZIP (CLI)

```bash
powershell Compress-Archive -Path dist\* -DestinationPath habit-tracker-build.zip
```

Result:

```
habit-tracker-build.zip
```

---

## 8. Optional — Fix Vulnerabilities

```bash
npm audit fix
```

(Not required unless you want clean dependency tree.)

---

## 9. Common Problems

### node / npm not found

Restart terminal or reinstall Node:

```bash
winget install OpenJS.NodeJS.LTS
```

---

### Firebase not working

- `.env` missing or wrong
- Forgot `VITE_` prefix
- Need restart after edit
- Firebase Auth not enabled
- Firestore rules blocking access

---

### Port already in use

Kill old process or change port:

```bash
npm run dev -- --port 3000
```

---

## 10. Daily Workflow (Terminal)

```bash
cd D:\Project\habit-tracker
git pull
npm install
npm run dev
```

Before deploy:

```bash
npm.cmd run build
firebase.cmd deploy
```

---

## 11. Useful Commands

```bash
node -v
npm -v
npm install
npm run dev
npm run build
npm run preview
npm audit
npm audit fix
dir
type package.json
```

---

## 12. Best Practices

- Always use `.env` for Firebase keys
- Do NOT commit `.env` to GitHub
- Run `npm run build` before deploy
- Test with `npm run preview`
- Keep Node LTS version
- Use Git for version control
- Backup Firebase rules 
- Keep project reproducible via terminal

---

## 13. Next Steps (Optional)

- Deploy to Firebase Hosting (CLI)
- Convert to PWA (installable app)
- Add charts / statistics
- Build desktop version (Electron)
- Optimize for software engineer portfolio
- Add AI habit coach
- Integrate training / analytics

