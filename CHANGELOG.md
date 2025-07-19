# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Session Cost Tracking**: Real-time tracking of AI model costs during sessions
  - Displays total session cost when quitting
  - Shows cost breakdown by model when switching between providers
  - Tracks costs across model switches within a session
  - Handles free tier (Gemini) vs paid models appropriately
  - Smart cost formatting based on amount (e.g., "Free", "<$0.0001", "$0.043")
  
- **Model Caching (24-hour)**: Centralized caching system for model listings
  - Reduces API calls to provider endpoints
  - 24-hour cache duration for all providers (Gemini, OpenRouter, Custom API)
  - Provider-specific cache keys to handle different configurations
  - Improves performance when using `/models` command repeatedly

- **Enhanced `/models` Command**:
  - Loading indicator while fetching models
  - Curated list of 5-7 recommended models shown by default
  - `--all` flag to show all available models grouped by provider
  - Pricing displayed as "per 1M tokens" for better readability
  - Model count summary at the end of the list

- **Model Switching Mid-Session**:
  - New `/model` slash command to show current model or switch to a different one
  - Current model displayed in session context
  - Seamless switching between providers during active sessions

### Changed
- Rebranded from `gemini-cli` to `sport-cli` with backward compatibility
  - Main command changed from `gemini` to `sport`
  - `gemini` command still works but shows deprecation warning
  - Updated all package namespaces to `@sport`
  - Changed copyright to SportsCulture LLC while maintaining Apache-2.0 license

### Fixed
- Token counting now correctly accumulates conversation history in input tokens

## [0.1.12] - Previous releases
See git history for changes in previous versions.