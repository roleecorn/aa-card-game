# Release flow

`main` is the single source-of-truth for application code, deployment workflows, and release-only presentation behavior.

`release` is only the deployment pointer for the version currently published to GitHub Pages. It must not carry source code, workflow, or UI changes that do not also exist in `main`.

## Normal release

1. Finish and merge normal development into `main`.
2. Create a temporary release branch from the desired `main` commit, for example `release/20260912`.
3. Open a pull request from that temporary branch to `release`.
4. Merge after CI succeeds.
5. The `Deploy Release to GitHub Pages` workflow runs because `release` moved.

Do not use `main` itself as the head branch of a long-lived PR to `release`; keeping a temporary release branch avoids forcing GitHub to update the protected `main` branch when the release target has moved.

## Recovery from divergence

If `release` contains historical release-only changes:

1. Move every still-needed workflow or source change back into `main` through a normal PR.
2. Verify `main` contains all required release behavior.
3. Realign `release` to the chosen `main` commit as a one-time maintenance operation.
4. Re-enable the intended branch protection for `release`.

After recovery, new feature work must happen on normal branches and flow into `main`; `release` should only advance through release promotion.
