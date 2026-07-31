# NxShell monorepo build
# Usage:
#   make install   - install dependencies for all modules
#   make dist      - full build and package
#   make clean     - remove build outputs
#   make clean-all - remove build outputs and node_modules

.PHONY: all install lint lint-fix dev core shell native pack dist dist_cn clean clean-all

export buildTimes := $(shell date -u +%Y%m%d%H%M)
VERSION ?= $(shell node -p "require('./package.json').version")
ELECTRON_VERSION := 43.2.0

all: dist

# -----------------------------------------------------------------------------
# Install dependencies
# -----------------------------------------------------------------------------
install: core/node_modules shell/node_modules node_modules

core/node_modules: core/package.json
	cd core && npm install --production=false
	touch $@

shell/node_modules: shell/package.json
	cd shell && npm install --production=false
	touch $@

node_modules: package.json
	npm install --production=false
	touch $@

# -----------------------------------------------------------------------------
# Lint
# -----------------------------------------------------------------------------
lint: shell/node_modules
	cd shell && npm run lint

lint-fix: shell/node_modules
	cd shell && npm run lint:fix

# -----------------------------------------------------------------------------
# Local development
# -----------------------------------------------------------------------------
dev: install core
	node scripts/dev.js

# -----------------------------------------------------------------------------
# Build core (Electron main process)
# -----------------------------------------------------------------------------
core: core/node_modules
	node scripts/write-version.js $(VERSION)
	cd core && npm run build

# -----------------------------------------------------------------------------
# Build shell (Vue renderer + ptservices)
# -----------------------------------------------------------------------------
shell: shell/node_modules
	cd shell && npm run build
	cd shell && node devtools/buildservice.js

# -----------------------------------------------------------------------------
# Build native modules for packaged app
# -----------------------------------------------------------------------------
native: pack
	mkdir -p pack/native
	cp build/native-package.json pack/native/package.json
	cd pack/native && npm install --production=false
	cd pack/native && npm run rebuild -- -f -v $(ELECTRON_VERSION) -w serialport,node-pty

# -----------------------------------------------------------------------------
# Stage application for electron-builder
# -----------------------------------------------------------------------------
pack: core shell
	mkdir -p pack
	cp core/dist/*.js pack/
	cp build/app-package.json pack/package.json

# -----------------------------------------------------------------------------
# Package with electron-builder
# -----------------------------------------------------------------------------
dist: pack native
	@echo "buildTimes=$(buildTimes)" > electron-builder.env
	@node -e "const fs=require('fs'); const p='pack/package.json'; const pkg=JSON.parse(fs.readFileSync(p,'utf8')); pkg.version='$(VERSION)'; fs.writeFileSync(p, JSON.stringify(pkg,null,2)+'\\n');"
	npx electron-builder --config electron-builder.yml

dist_cn:
	ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ $(MAKE) dist

# -----------------------------------------------------------------------------
# Clean
# -----------------------------------------------------------------------------
clean:
	rm -rf pack dist core/dist shell/dist shell/devtools/webpack/dist electron-builder.env

clean-all: clean
	rm -rf core/node_modules shell/node_modules node_modules
