# EDS Channel Tracker

A self-service internal tool to monitor customer communication channels to discuss EDS

## Environments

- Preview: <https://main--eds-channel-tracker--aemdemos.aem.page/>
- Live: <https://main--eds-channel-tracker--aemdemos.aem.live/>

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on <https://www.aem.live/docs/> and more specifically:

1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template and add a mountpoint in the `fstab.yaml`
2. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
3. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
4. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
5. Open the `eds-channel-tracker` directory in your favorite IDE and start coding
