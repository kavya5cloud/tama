# Tama local setup

This repository is currently being developed locally in `tama-release`.

The GitHub repository was created with an initial README commit, so the local project should integrate that commit before pushing its full source tree.

## Push the existing local project

```bash
cd ~/Downloads/tama-release
git fetch origin
git pull --rebase origin main
git push -u origin main
```

If Git reports unrelated histories, stop rather than forcing the push; resolve the histories explicitly so the existing README is preserved.
