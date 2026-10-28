# Shared Workspace (GitHub Pages + Firebase)

A small shared webpage with an editable table and a notes field. Firebase Firestore stores the data and `onSnapshot` synchronizes updates live.

## 1. Create Firebase project

1. Go to https://console.firebase.google.com/ and create a project.
2. In **Build → Authentication → Sign-in method**, enable **Anonymous**.
3. In **Build → Firestore Database**, create a database.
4. In Project settings → General, create/register a **Web app** and copy its Firebase config.
5. In Firestore → Rules, paste the contents of `firestore.rules` and publish.
   - These rules allow any anonymous authenticated visitor to read/write the one shared document.
   - This matches the requested “anyone with the link can edit” behavior, but it is not private or protected against someone sharing the link.
   - For sensitive content, use real user accounts and restrict rules.

## 2. Add Firebase config to the page

Open `index.html` and replace the placeholder values in `firebaseConfig`:

- `YOUR_API_KEY`
- `YOUR_PROJECT_ID`
- `YOUR_APP_ID`

Use the values from your Firebase Web App config. `authDomain` should generally be `<project-id>.firebaseapp.com`.

Firebase web config is not a server secret. Security is enforced by Firestore rules, not by hiding this config.

## 3. Publish on GitHub Pages

1. Create a GitHub repository, for example `shared-workspace`.
2. Upload `index.html` and `firestore.rules` to the repository root.
3. Go to repository **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.
6. Wait for the Pages deployment and open the URL shown there. It will usually be:
   `https://YOUR_GITHUB_USERNAME.github.io/shared-workspace/`
7. Send that URL to your friend.

## Notes

- The app uses a single Firestore document at `sharedWorkspaces/main`.
- Changes are saved after a short pause while typing.
- Since the table and notes are saved as one document, simultaneous edits to different areas can overwrite each other in edge cases. For a small shared page this is often acceptable; a more robust version would store each row and notes separately and use conflict-aware editing.
- Firebase has free usage quotas, but quotas and terms can change. Add billing alerts if you enable billing.
