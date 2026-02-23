.PHONY: all python typescript test lint typecheck

all: python typescript

python:
	$(MAKE) -C python all

typescript:
	cd typescript && npm run all

test:
	$(MAKE) -C python test
	cd typescript && npm run test

lint:
	$(MAKE) -C python lint
	cd typescript && npm run lint

typecheck:
	$(MAKE) -C python typecheck
	cd typescript && npm run typecheck
