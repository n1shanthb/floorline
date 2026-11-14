use near_sdk::{
    env,
    json_types::{U128, U64},
    near,
    serde_json::{json, Value},
    AccountId, Gas, NearToken, Promise, PromiseOrValue,
};
#[near(contract_state)]
#[derive(Default)]
pub struct Fixture {}
fn call(target: AccountId, method: &str, args: Value, deposit: u128) -> Promise {
    let gas = if env::prepaid_gas().as_gas() < Gas::from_tgas(100).as_gas() {
        25
    } else {
        150
    };
    Promise::new(target).function_call(
        method,
        near_sdk::serde_json::to_vec(&args).unwrap(),
        NearToken::from_yoctonear(deposit),
        Gas::from_tgas(gas),
    )
}
#[near]
impl Fixture {
    pub fn unregister_and_disappear(&mut self, target: AccountId, beneficiary: AccountId) -> Promise {
        call(target, "storage_unregister", json!({"force":false}), 1).detach();
        Promise::new(env::current_account_id()).delete_account(beneficiary)
    }
    #[private]
    pub fn ft_forward_result(&self) -> U128 {
        U128(0)
    }
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<Value> {
        let _ = sender_id;
        let v: Value = near_sdk::serde_json::from_str(&msg).unwrap_or(json!({"kind":msg}));
        match v["kind"].as_str().unwrap() {
            "accept" => PromiseOrValue::Value(json!("0")),
            "reject" => PromiseOrValue::Value(json!(amount)),
            "malformed" => PromiseOrValue::Value(json!({"bad":true})),
            "panic" => panic!("receiver panic"),
            "forward" => call(
                env::predecessor_account_id(),
                "ft_transfer",
                json!({"receiver_id":v["to"],"amount":amount,"memo":null}),
                1,
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "ft_forward_result",
                b"{}".to_vec(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(5),
            ))
            .into(),
            "borrow" => call(
                env::predecessor_account_id(),
                "accept_offer",
                json!({"loan_id":v["loan_id"]}),
                0,
            )
            .into(),
            _ => panic!("bad fixture mode"),
        }
    }
    pub fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: String,
        msg: String,
    ) -> PromiseOrValue<Value> {
        let _ = (sender_id, previous_owner_id);
        let v: Value = near_sdk::serde_json::from_str(&msg).unwrap_or(json!({"kind":msg}));
        match v["kind"].as_str().unwrap() {
            "accept" => PromiseOrValue::Value(json!(false)),
            "reject" => PromiseOrValue::Value(json!(true)),
            "malformed" => PromiseOrValue::Value(json!({"bad":true})),
            "panic" => panic!("receiver panic"),
            "forward" => call(
                env::predecessor_account_id(),
                "nft_transfer",
                json!({"receiver_id":v["to"],"token_id":token_id,"approval_id":null,"memo":null}),
                1,
            )
            .into(),
            "repay" => call(
                env::predecessor_account_id(),
                "repay",
                json!({"loan_id":token_id}),
                v["repayment"].as_str().unwrap().parse().unwrap(),
            )
            .into(),
            "default" => call(
                env::predecessor_account_id(),
                "default_loan",
                json!({"loan_id":token_id}),
                0,
            )
            .into(),
            "exhaust" => loop {
                env::sha256(&[1u8; 4096]);
            },
            _ => panic!("bad fixture mode"),
        }
    }
    #[payable]
    pub fn act(
        &mut self,
        target: AccountId,
        method: String,
        args: Value,
        deposit: U128,
    ) -> Promise {
        call(target, &method, args, deposit.0)
    }
    pub fn withdraw_and_disappear(
        &mut self,
        target: AccountId,
        claim_id: U64,
        beneficiary: AccountId,
    ) -> Promise {
        call(target, "withdraw_claim", json!({"claim_id":claim_id}), 0).detach();
        Promise::new(env::current_account_id()).delete_account(beneficiary)
    }
}
