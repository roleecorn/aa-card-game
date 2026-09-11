# Release flow

`main` is the single source-of-truth for application code, deployment workflows, and release presentation behavior.

`release` is only the deployment pointer for the version currently published to GitHub Pages. It must not carry source code, workflow, or UI changes that do not also exist in `main`.

## Development flow

Normal development never deploys GitHub Pages:

1. Create a feature/fix branch.
2. Open a pull request to `main`.
3. Pass `CI / verify`.
4. Merge to `main` with **Squash merge**.

A push to `main` runs CI, but `Deploy Release to GitHub Pages` does not run because that workflow only listens to `release`.

## Release promotion

When the current `main` is ready to publish:

1. Open a pull request with **head `main` and base `release`**.
2. Pass `CI / verify`.
3. Merge the pull request with **Create a merge commit**.
4. The resulting push to `release` triggers `Deploy Release to GitHub Pages`.
5. The deployment workflow records the release timestamp and publishes the built artifact.

Do **not** Squash merge or Rebase merge a `main -> release` promotion. The release merge commit must retain the promoted `main` commit as an ancestor; otherwise `main` and `release` will diverge again even when their file contents look the same.

CI rejects pull requests targeting `release` unless the head is this repository's `main` branch. Feature branches must go through `main` first.

## Branch protection

Use separate rulesets because `main` and `release` have different merge semantics.

### `main`

- Require a pull request before merging.
- Require `verify` to pass.
- Require the branch to be up to date before merging.
- Allow **Squash merge** only.
- Block force pushes and deletion.

### `release`

- Require a pull request before merging.
- Require `verify` to pass.
- **Do not** require the PR head to be up to date with `release`.
- Allow **Merge commit** only.
- Block force pushes and deletion.

The `release` ruleset must not enable strict/up-to-date status checks. Each successful release has its own merge commit on `release`; requiring `main` to contain that release-only merge commit would create a circular update requirement on the next promotion.

## Recovery from divergence

If `release` ever contains historical release-only changes:

1. Move every still-needed workflow or source change back into `main` through a normal PR.
2. Verify `main` contains all required release behavior.
3. Realign `release` to the chosen `main` commit as a one-time maintenance operation.
4. Restore the `release` ruleset described above.

After recovery, new feature work must happen on normal branches and flow into `main`; `release` advances only through `main -> release` promotion pull requests.
