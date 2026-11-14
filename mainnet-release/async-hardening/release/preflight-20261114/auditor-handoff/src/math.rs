use crate::{Error, Result as EconomicResult};
// Isolate dependency-generated Result signatures from the engine's Result alias.
#[allow(
    deprecated,
    semicolon_in_expressions_from_non_local_macros,
    clippy::manual_div_ceil,
    clippy::assign_op_pattern
)]
mod integer {
    uint::construct_uint! { pub struct Wide(8); }
}
pub(crate) use integer::Wide;
pub(crate) fn wide(n: u128) -> Wide {
    Wide::from(n)
}
pub(crate) fn narrow(n: Wide) -> EconomicResult<u128> {
    if n > wide(u128::MAX) {
        Err(Error::Overflow)
    } else {
        Ok(n.low_u128())
    }
}
pub fn backing_not_lower(old_l: u128, old_t: u128, new_l: u128, new_t: u128) -> bool {
    old_t == 0 || new_t == 0 || wide(new_l) * wide(old_t) >= wide(old_l) * wide(new_t)
}
/// Exact rational curve, rounded once at the end. At most 398 numerator bits.
pub fn redemption_quote(l: u128, t: u128, c: u128, tax_bps: u16) -> EconomicResult<u128> {
    if tax_bps >= 10_000 || t == 0 || c == 0 || c > t {
        return Err(Error::InvalidAmount);
    }
    let numerator = wide(l)
        * wide(c)
        * (wide(10_000 - u128::from(tax_bps)) * wide(t) + wide(u128::from(tax_bps)) * wide(c));
    narrow(numerator / (wide(10_000) * wide(t) * wide(t)))
}
