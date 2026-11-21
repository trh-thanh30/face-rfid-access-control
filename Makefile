.PHONY: install infra-up infra-down generate migrate seed dev test check

install:
	pnpm install

infra-up:
	pnpm infra:dev:up

infra-down:
	pnpm infra:dev:down

generate:
	pnpm prisma:generate

migrate:
	pnpm prisma:migrate:dev

seed:
	pnpm db:seed:dev

dev:
	pnpm dev:full

test:
	pnpm test

check:
	pnpm lint && pnpm check-types && pnpm test && pnpm build
