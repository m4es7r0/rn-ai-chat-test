# rn-ai-chat-test — dev & build commands.
# Version is read from app.json so it stays the single source of truth.

APP_VERSION := $(shell node -p "require('./app.json').expo.version")
BUILD_DIR   := build
APK         := $(BUILD_DIR)/rn-ai-chat-test-$(APP_VERSION).apk
DEV_APK     := $(BUILD_DIR)/rn-ai-chat-test-$(APP_VERSION)-dev.apk

.DEFAULT_GOAL := help

.PHONY: help install start dev ios android apk apk-dev install-dev version clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install JS dependencies
	npm install

start: ## Start Metro / Expo dev server (Expo Go)
	npx expo start

dev: ## Start Metro for the dev build (live changes via Fast Refresh)
	npx expo start --dev-client

ios: ## Run on iOS (dev build / simulator)
	npx expo run:ios

android: ## Run on Android (dev build / emulator)
	npx expo run:android

version: ## Print the app version from app.json
	@echo $(APP_VERSION)

apk: ## Local EAS build: Android 'preview' APK -> build/rn-ai-chat-test-<version>.apk
	@mkdir -p $(BUILD_DIR)
	npx eas build --platform android --profile preview --local --output $(APK)
	@echo ""
	@echo "✓ APK готов: $(APK) (version $(APP_VERSION))"

apk-dev: ## Local EAS build: Android DEV-client APK (ставится раз, JS обновляется через 'make dev')
	@mkdir -p $(BUILD_DIR)
	npx eas build --platform android --profile development --local --output $(DEV_APK)
	@echo ""
	@echo "✓ Dev APK готов: $(DEV_APK)"
	@echo "  Установи его на девайс, затем запусти: make dev"

install-dev: ## Установить dev APK на подключённый по USB девайс (adb) + проброс Metro
	adb install -r $(DEV_APK)
	adb reverse tcp:8081 tcp:8081
	@echo "✓ Установлено. Запусти: make dev"

clean: ## Remove local build artifacts
	rm -rf $(BUILD_DIR)
