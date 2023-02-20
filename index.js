import * as Kilt from '@kiltprotocol/sdk-js'
import { Keyring } from '@polkadot/api'
import { load } from 'js-yaml'
import { readFileSync } from 'fs'

async function getUnclaimed(api, address) {
    console.log('Checking rewards...')
    const rewards = await api.call.staking.getUnclaimedStakingRewards(address)
    const decimals = rewards.registry.chainDecimals[0]
    const kilts = rewards / Math.pow(10, decimals)
    return kilts
}

async function claimRewards(api, mnemonic) {
    console.log('Claiming rewards...')
    const tx = api.tx.utility.batch([
        // convert collator participation points into rewards
        api.tx.parachainStaking.incrementCollatorRewards(),
        // mint rewards for collator address
        api.tx.parachainStaking.claimRewards()
    ])

    const keyring = new Keyring({ type: 'sr25519' });
    const submitterAccount = keyring.addFromUri(mnemonic);

    await tx.signAndSend(submitterAccount, ({ status, dispatchError }) => {
        if (status.isFinalized && !dispatchError) {
            address = submitterAccount.address
            txHash = status.asFinalized.toString()
            console.log(`Claimed collator staking rewards for ${address} with tx hash ${txHash}`)
        }
        if (dispatchError) {
            if (dispatchError.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = api.registry.findMetaError(dispatchError.asModule)
                const { docs, name, section } = decoded

                const error = new Error(`${section}.${name}: ${docs.join(' ')}`)
                throw error
            } else {
                // Other, CannotLookup, BadOrigin, no extra info
                const error = new Error(dispatchError.toString())
                throw error
            }
        }
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function readConfig() {
    let yamlFile = readFileSync("test.yml", "utf8");
    let loadedYaml = load(yamlFile);

    console.log(loadedYaml);
    console.log(loadedYaml.apa);
}

async function main() {
    const url = 'wss://kilt-rpc.dwellir.com'
    try {
        console.log("Connecting to " + url)
        Kilt.connect(url)
        await sleep(5000)
        const api = Kilt.ConfigService.get('api')
    
        const rewards = await getUnclaimed(api, '4phJhaKeWdThVBGcBY2GR8fbLbd6scz4J48oELePS6bBY4rT')
        console.log("Unclaimed rewards: " + rewards)

        if (rewards > 30) {
            await claimRewards(api, 'entire material egg meadow latin bargain dutch coral blood melt acoustic thought')
        }
    } catch(error) {
        console.log("Disconnecting " + url)
        await Kilt.disconnect()
        process.exit(1)
    }
    console.log("Disconnecting " + url)
    await Kilt.disconnect()
}

//main()
readConfig()
