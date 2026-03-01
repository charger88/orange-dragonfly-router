# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1]

### Added

- Expanded automated test coverage for route metadata isolation, case-sensitivity changes, multi-character separators, and proxy route precedence.

### Changed

- `routes` and `route()` now return defensive copies of route records so callers cannot mutate the router's internal state.
- Route matching now precomputes internal metadata for static, integer, wildcard, and proxy routes to reduce per-request work.

### Fixed

- Static route matching now respects `caseSensitive` option changes made after routes are registered.
- Multi-character separators are now treated as full literal delimiters during parameter matching and trailing-separator trimming.
- `{+name}` proxy routes are now deferred so exact and more specific matches win before proxy fallbacks.

## [1.0.0]

### Added

- Support for `{+name}` placeholders (greedy string params that may include separators, useful for proxy-style routes).
