//! LOCAL SANDBOX ONLY adversarial receiver, NEVER a production contract.
use near_sdk::{
    env,
    json_types::U128,
    near,
    serde_json::{json, Value},
    AccountId, Gas, NearToken, Promise, PromiseOrValue,
};
#[near(contract_state)]
#[derive(Default)]
pub struct Receiver {}
#[near]
impl Receiver {
    pub fn act(&self, target: AccountId, method: String, args: Value, deposit: U128) -> Promise {
        Promise::new(target).function_call(
            method,
            near_sdk::serde_json::to_vec(&args).unwrap(),
            NearToken::from_yoctonear(deposit.0),
            Gas::from_tgas(200),
        )
    }
    pub fn ft_on_transfer(
        &self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<Value> {
        let _ = sender_id;
        let data: Value =
            near_sdk::serde_json::from_str(&msg).unwrap_or_else(|_| json!({"kind":msg}));
        match data["kind"].as_str().unwrap() {
            "accept"=>PromiseOrValue::Value(json!("0")),
            "reject"=>PromiseOrValue::Value(json!(amount)),
            "malformed"=>PromiseOrValue::Value(json!({"invalid":true})),
            "oversize"=>PromiseOrValue::Value(json!("x".repeat(200000))),
            "panic"=>panic!("intentional receiver failure"),
            "exhaust"=>{loop {env::sha256(&[0;1024]);}},
            "forward"=>PromiseOrValue::Promise(Promise::new(env::predecessor_account_id()).function_call("ft_transfer",near_sdk::serde_json::to_vec(&json!({"receiver_id":data["to"],"amount":amount,"memo":null})).unwrap(),NearToken::from_yoctonear(1),Gas::from_tgas(20))),
            "redeem"=>PromiseOrValue::Promise(Promise::new(env::predecessor_account_id()).function_call("redeem",near_sdk::serde_json::to_vec(&json!({"amount":amount,"min_near":"0","deadline_ns":"18446744073709551615"})).unwrap(),NearToken::from_yoctonear(1),Gas::from_tgas(25))),
            "forward_unregister"=>PromiseOrValue::Promise(Promise::new(env::predecessor_account_id()).function_call("ft_transfer",near_sdk::serde_json::to_vec(&json!({"receiver_id":data["to"],"amount":amount,"memo":null})).unwrap(),NearToken::from_yoctonear(1),Gas::from_tgas(15)).then(Promise::new(env::predecessor_account_id()).function_call("storage_unregister",near_sdk::serde_json::to_vec(&json!({"force":true})).unwrap(),NearToken::from_yoctonear(1),Gas::from_tgas(15)))),
            _=>panic!("unknown scenario"),
        }
    }
    pub fn delete_then_withdraw(
        &self,
        target: AccountId,
        claim_id: String,
        beneficiary: AccountId,
    ) -> Promise {
        Promise::new(env::current_account_id())
            .delete_account(beneficiary)
            .then(Promise::new(target).function_call(
                "withdraw_claim",
                near_sdk::serde_json::to_vec(&json!({"claim_id":claim_id})).unwrap(),
                NearToken::from_yoctonear(1),
                Gas::from_tgas(180),
            ))
    }
}
