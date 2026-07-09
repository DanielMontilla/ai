---
name: finding-vendors
description: Finds, explores, and reports on third-party vendor source code vendored as git submodules. Use when the user wants to examine vendor code, find a specific vendor package, or understand available vendor dependencies.
author: Daniel Montilla
version: 1.0.0
license: MIT
groups:
  - vendors
  - workflow
---

# When To Use

Use when the user wants to examine vendor source code, find a specific vendor package in the project, or understand what vendors are available.

# Pipeline

## 1. Identify Vendor Request

Determine which vendor or type of vendor code the user needs based on their request.

## 2. Locate Vendor

Search the `vendor/` directory for matching vendor packages using Glob. Cross-reference with the Vendor Registry in the Reference section below.

## 3. Present Information

For each matching vendor, provide:
- **Path**: Location under `vendor/`
- **Purpose**: What the library does
- **URL**: Original source repository

## 4. Read Vendor Code (if requested)

If the user wants to read or analyze vendor source, navigate to the vendor directory and read the relevant files.

# Reference

> **⚠️ Vendors are READ ONLY.** They are git submodules included for local reference and analysis only. They are **not** dependencies of the monorepo, its packages, services, or applications. Do not modify vendor files or import from them in production code.

| Vendor | Path | URL |
|--------|------|-----|
| alchemy-effect | vendor/alchemy-effect | https://github.com/alchemy-run/alchemy-effect.git |
| drizzle-orm | vendor/drizzle-orm | https://github.com/drizzle-team/drizzle-orm |
| effect | vendor/effect | https://github.com/Effect-TS/effect-smol |
| orpc | vendor/orpc | https://github.com/middleapi/orpc.git |
| shadcn-svelte | vendor/shadcn-svelte | https://github.com/huntabyte/shadcn-svelte |
| sveltekit | vendor/sveltekit | https://github.com/sveltejs/kit.git |
| signoz | vendor/signoz | https://github.com/SigNoz/signoz |
| workers-oauth-provider | vendor/workers-oauth-provider | https://github.com/cloudflare/workers-oauth-provider |
| effect-cf | vendor/effect-cf | https://github.com/jbt95/effect-cf |
| vitest | vendor/vitest | https://github.com/vitest-dev/vitest |

To add a new vendor, use `adding-vendor` skill.
