import * as Kilt from '@kiltprotocol/sdk-js'
import { Keyring } from '@polkadot/api'

export async function getUnclaimed(api, address) {
    console.log('Checking rewards...')
    const rewards = await api.call.staking.getUnclaimedStakingRewards(address)
    const decimals = rewards.registry.chainDecimals[0]
    const kilts = rewards / Math.pow(10, decimals)
    return kilts
}

export async function claimRewards(api, mnemonic) {
    console.log('Claiming rewards...')
    const tx = api.tx.utility.batch([
        // convert collator participation points into rewards
        api.tx.parachainStaking.incrementCollatorRewards(),
        // mint rewards for collator address
        api.tx.parachainStaking.claimRewards()
    ])

    const keyring = new Keyring({ type: 'sr25519' });
    const submitterAccount = keyring.addFromUri(mnemonic);

    const onSuccess = (address, txHash, resolve) => {
        console.log(`Claimed collator staking rewards for ${address} with tx hash ${txHash}`)
        resolve(txHash)
    }

    const onError = (error, reject) => {
        console.error(`Failed to claim collator staking rewards due to ${error}`)
        reject(error)
    }

    const txPromise = new Promise((resolve, reject) => {
        tx.signAndSend(submitterAccount, ({ status, dispatchError }) => {
            if (status.isFinalized && !dispatchError) {
                onSuccess(
                    submitterAccount.address,
                    status.asFinalized.toString(),
                    resolve
                )
            }
            if (dispatchError) {
                if (dispatchError.isModule) {
                    // for module errors, we have the section indexed, lookup
                    const decoded = api.registry.findMetaError(dispatchError.asModule)
                    const { docs, name, section } = decoded

                    const error = new Error(`${section}.${name}: ${docs.join(' ')}`)
                    onError(error, reject)
                } else {
                    // Other, CannotLookup, BadOrigin, no extra info
                    const error = new Error(dispatchError.toString())
                    onError(error, reject)
                }
            }
        })
    })
    return txPromise
}

async function main() {
    const url = 'wss://kilt-rpc.dwellir.com'
    await Kilt.connect(url)
    const api = Kilt.ConfigService.get('api')

    const rewards = await getUnclaimed(api, '4phJhaKeWdThVBGcBY2GR8fbLbd6scz4J48oELePS6bBY4rT')
    console.log(rewards)
    if (rewards > 30) {
        try {
            await claimRewards(api, 'entire material egg meadow latin bargain dutch coral blood melt acoustic thought')
        } catch(e) { console.log("JOCKE CATCHED") }
    }
    console.log("disconnecting!!!!!!!!!!!!!!!!")
    await Kilt.disconnect()
}

main()
