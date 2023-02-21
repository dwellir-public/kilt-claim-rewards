# kilt-claim-rewards
Claim Kilt collator rewards using Kilt SDK and Polkadot api.

This is a small javascript that can claim Kilt collator rewards.

It needs path to a yaml config file as argument. An example file is included in the repo (config.yml):

**url**: Url to the RPC node endpoint to use for the extrinsics.  
**rewardsLimit**: Don't pay unnecessary fees claiming small rewards. If the amount of rewards is less than this value, no claim is performed.  
**address**: The address to check unclaimed rewards for.  
**mnemonic**: The mnemonic/seed for the `address` account. Needed for the actual claim.

NOTE: There is no check for that the `address` and the `mnemonic` is the same account. If they are not, the `rewardsLimit` check will not work as expected.

Run this script on schedule as a cronjob or as a service timer for automated reward claims. The script is supposed to return exit code 1 on any errors, such as RPC connection fail or not enough funds for fees.
