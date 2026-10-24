# Auto-detección de motor: Podman primero, Docker como fallback.
ENGINE ?= $(shell command -v podman 2>/dev/null || command -v docker 2>/dev/null)
DC = "$(ENGINE)" compose -f docker-compose.yml
DCD = "$(ENGINE)" compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help install build build-web up down logs ps restart dev up-dev down-dev logs-dev ps-dev lint fmt fmt-check typecheck test check-web clean clean-dev

help:
	@echo "Trust — comandos disponibles:"
	@echo ""
	@echo "  Desarrollo:"
	@echo "    make install       Instalar dependencias (pnpm)"
	@echo "    make dev           Backend con hot reload"
	@echo "    make dev-web       Front con Vite+ (5173)"
	@echo "    make build         Build backend (rspack)"
	@echo "    make build-web     Build front (Vite+)"
	@echo ""
	@echo "  Contenedores (Podman/Docker):"
	@echo "    make up            Levantar api + postgres"
	@echo "    make down          Parar servicios"
	@echo "    make logs          Ver logs"
	@echo "    make ps            Ver estado"
	@echo "    make up-dev        Levantar todo containerizado (hot reload)"
	@echo "    make down-dev      Parar desarrollo"
	@echo ""
	@echo "  Calidad:"
	@echo "    make lint          Oxlint (backend + front)"
	@echo "    make fmt           Oxfmt (backend)"
	@echo "    make fmt-check     Verificar formato"
	@echo "    make typecheck     tsc --noEmit"
	@echo "    make test          Vitest"
	@echo "    make check-web     vp check (front)"
	@echo ""
	@echo "  Limpieza:"
	@echo "    make clean         Bajar y borrar volúmenes"
	@echo "    make clean-dev     Igual, para desarrollo"

.DEFAULT_GOAL := help

install:
	pnpm install

build:
	pnpm build

build-web:
	pnpm build:web

dev:
	pnpm start:dev

dev-web:
	pnpm dev:web

up:
	$(DC) up -d --build

down:
	$(DC) down

logs:
	$(DC) logs -f

ps:
	$(DC) ps

restart:
	$(DC) restart

up-dev:
	$(DCD) up -d --build

down-dev:
	$(DCD) down

logs-dev:
	$(DCD) logs -f

ps-dev:
	$(DCD) ps

lint:
	pnpm lint

fmt:
	pnpm format

fmt-check:
	pnpm format:check

typecheck:
	pnpm typecheck

test:
	pnpm test

check-web:
	pnpm --filter web check

clean:
	$(DC) down -v --rmi local

clean-dev:
	$(DCD) down -v --rmi local
