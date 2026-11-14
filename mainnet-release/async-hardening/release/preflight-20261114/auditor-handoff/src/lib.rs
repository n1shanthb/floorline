//! Gate 1 deterministic economic engine. No runtime or token-standard claim.
mod engine;
mod math;
pub use engine::*;
pub use math::{backing_not_lower, redemption_quote};
#[cfg(all(feature = "contract", target_arch = "wasm32"))]
mod contract;
