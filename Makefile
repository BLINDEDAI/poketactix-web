# PokeTactix web — task runner. No Docker (project-standards § Stack: no container runtime).
# Targets delegate to the npm scripts that the quality gates and CI also use.

.DEFAULT_GOAL := help
.PHONY: help install up dev build preview test format format-check lint type-check audit quality

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies from the committed lockfile
	npm ci

up: dev ## Alias for `dev` — start the Vite dev server

dev: ## Start the Vite dev server
	npm run dev

build: ## Type-check and produce the production static build
	npm run build

preview: ## Preview the production build locally
	npm run preview

test: ## Run the Vitest suite once
	npm run test

format: ## Auto-format the codebase with Prettier
	npm run format

format-check: ## Check formatting (prettier --check) — quality gate
	npm run format:check

lint: ## Lint with ESLint — quality gate
	npm run lint

type-check: ## Type-check with vue-tsc --noEmit — quality gate
	npm run type-check

audit: ## Dependency audit — fail on known criticals
	npm audit --audit-level=critical

quality: format-check lint type-check test audit ## Run every quality gate (project-standards § Quality gates)
	@echo "All quality gates passed."
