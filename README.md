# Boilerplate Frontend Application
Using Nuxt 3, FlyonUI 5, Tailwind CSS 4, TypeScript, Eslint (Antfu).

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## 1. Prerequisites

- Node.js - `v22.0.0` or newer
- Terminal - In order to run Nuxt commands
- Yarn (Package Manager)

## 2. Setup

### Repository

1. Copy environment variables and fill in the values:

```bash
# Copy the example file
cp .env.example .env

# Replace all the placeholder values
nano .env
```

2. Make sure to install the dependencies:

```bash
yarn install
```

### Code Formatting

This repository utilize [@antfu/eslint-config](https://github.com/antfu/eslint-config) as linting tools and formatting tools (aimed to be used standalone without Prettier).

Run the following command to lint and fix formatting:

```bash
yarn lint:fix
```

### Branching

_To be added._

### Code Review

_To be added._

## 3. Start Development Server

Start the development server on `http://localhost:3000`:

```bash
yarn dev
```

Start the development server on host IP address port `3000`:

```bash
yarn dev:host
```

## 4. Start Production Server

Build the application for production:

```bash
yarn build
```

Locally preview production build:

```bash
yarn preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
