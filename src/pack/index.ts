/**
 * pack/: loads and validates a datapack; resolved exercises; equipment; profile;
 * constraints; config (APP_TECH_ARCHITECTURE_V0.md §6.1).
 *
 * Scope note (APP_BUILD_SEQUENCE_V0.md B1 vs B2/B5): this module currently exports
 * only the fixture/metadata cell decoders shared with the datapack tool (D-119). The
 * pack loader itself — `validatePack`, V-00a..g, family-approval and binding
 * resolution — is B2 (datapack tool) and B5 step E1 (engine conformance) work and is
 * intentionally not implemented here yet, per the foundation milestone's scope.
 */
export * from './decode';
