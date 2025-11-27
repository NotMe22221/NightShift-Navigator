# NightShift Navigator Tests

This directory contains test utilities and shared test fixtures for the NightShift Navigator SDK.

## Structure

- `setup.ts` - Global test setup and configuration
- Property-based tests are co-located with implementation files in the SDK modules
- Unit tests are also co-located with implementation files

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Property-Based Testing

This project uses `fast-check` for property-based testing. Each property test is tagged with a comment referencing the correctness property from the design document.

Example:
```typescript
// Feature: nightshift-navigator, Property 1: Brightness histogram computation
```
