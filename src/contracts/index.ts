/**
 * Contracts barrel: every declaration of APP_DATA_CONTRACTS_V0.md §4–§10 as a Zod
 * schema, with inferred types (D-099). This is the single source of truth for
 * document shapes — nothing outside this directory redeclares a contract type.
 */
export * from './primitives';
export * from './vocab';
export * from './document';
export * from './exercise';
export * from './equipment';
export * from './profile';
export * from './constraint';
export * from './config';
export * from './datapack';
export * from './checkIn';
export * from './generation';
export * from './workout';
export * from './externalSession';
export * from './event';
export * from './settings';
export * from './packHistory';
export * from './stateSummary';
export * from './meta';
export * from './backup';
