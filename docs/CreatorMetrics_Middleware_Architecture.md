# CreatorMetrics Middleware Architecture
## Solving Non-Public API Authentication & Data Collection

---

## Executive Summary

CreatorMetrics faces a core middleware challenge: extracting data from platforms without public APIs (LTK, Amazon Associates) while maintaining security, reliability, and user trust. This document applies production-grade middleware engineering principles to architect a resilient data collection system.

---

## 1. Platform Authentication Analysis

### LTK (LikeToKnow.it)

**Authentication System Discovered:**
- **Identity Provider**: Auth0 (enterprise-grade OAuth)
- **API Endpoint**: `creator-api-gateway.shopltk.com/v1`
- **Token Type**: JWT (JSON Web Tokens)
- **Session Persistence**: Browser cookies + localStorage

**Current Challenges:**
- No public API, OAuth client credentials blocked
- Tokens expire, require interactive refresh
- Auth0 may block automated logins (rate limits)

### Amazon Associates

**Authentication System:**
- **Primary**: Amazon SP-API (requires seller registration)
- **Alternative**: Product Advertising API (limited scope)
- **Reporting**: CSV/XML manual exports OR scraping

**Current Challenges:**
- No direct API for influencer earnings
- Reports require manual download or scraping
- Rate limiting on report generation

---

## 2. Middleware Architecture Patterns

### Pattern Selection: **Token Extraction Gateway**

Components: Browser Extension (Extract) → Token Relay (Validate) → Token Vault (Store) → API Client (Use). Includes rate limits, TTL management, circuit breaker.

---

## 3–10. Component Specs, Resilience, Security, Roadmap

See full document in repo for: Token Extractor, Token Relay, Token Vault, LTK/Amazon collectors, Circuit Breaker, Retry Policy, CSV Fallback, Logging, Health Checks, Credential Security, RLS schema, Implementation Roadmap, Risk Mitigation.

---

## Summary

This middleware provides: (1) Multiple data collection strategies (browser extension, Puppeteer, CSV fallback), (2) Resilience (circuit breakers, retry policies), (3) Security-first design (AES-256, RLS, cleanup), (4) Observability, (5) Graceful degradation when APIs fail.

*Full technical content copied from CreatorMetrics_Middleware_Architecture.md in Downloads.*
