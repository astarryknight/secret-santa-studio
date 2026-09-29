# Secret Santa Studio

A static Secret Santa name draw for GitHub Pages. It has no dependencies, build step, account, or server.

**Live site:** https://astarryknight.github.io/secret-santa-studio/

## Use it

Open the live site to enter names. After drawing, send each person only the link beside their name. Keep the results page open until every link is sent; assignments are not stored.

## Deployment

GitHub Pages publishes the root of the `main` branch. Push changes to `main` to update the site automatically.

## Link privacy

The `?v=` value contains one person's giver and recipient, lightly obfuscated with a random XOR key and URL-safe Base64. This hides names from casual inspection but is **not encryption**. Anyone who has a link can reveal that assignment. The participant list is not uploaded, but the encoded pair is part of the URL and may appear in hosting or browser logs.
