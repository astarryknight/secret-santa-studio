# Secret Santa Studio

A static Secret Santa name draw for GitHub Pages. It has no dependencies, build step, account, or server.

## Publish on GitHub Pages

1. Push these files to a GitHub repository.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select the branch containing these files and the **/(root)** folder, then save.

The page works at both a user site root and a project subpath. Open the published URL to enter names. After drawing, send each person only the link beside their name. Keep the results page open until every link is sent; assignments are not stored.

The `?v=` value contains one person's giver and recipient, lightly obfuscated with a random XOR key and URL-safe Base64. This hides names from casual inspection but is **not encryption**. Anyone who has a link can reveal that assignment. The participant list is not uploaded, but the encoded pair is part of the URL and may appear in hosting or browser logs.
