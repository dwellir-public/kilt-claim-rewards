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
    return new Promise(resolve => setTimeout(resolve, ms))
}

function readConfig(path) {
    try {
        const yamlFile = readFileSync(path, "utf8")
        const loadedYaml = load(yamlFile)
        return loadedYaml
    } catch(error) {
        console.log(error.message)
        process.exit(1)
    }
}

async function main() {
    if (process.argv.length !== 3) {
        console.error('Expected one argument: Path to a yaml config file.');
        process.exit(1);
    }
    const config = readConfig(process.argv[2])
    try {
        console.log("Connecting to " + config.url)
        Kilt.connect(config.url)
        await sleep(5000)
        const api = Kilt.ConfigService.get('api')
    
        const rewards = await getUnclaimed(api, config.address)
        console.log("Unclaimed rewards: " + rewards)

        if (rewards > config.rewardsLimit) {
            await claimRewards(api, config.mnemonic)
        } else {
            console.log(`Unclaimed rewards (${rewards}) is less than rewardsLimit (${config.rewardsLimit}). Not claiming.`)
        }
    } catch(error) {
        console.log("Disconnecting " + config.url)
        await Kilt.disconnect()
        process.exit(1)
    }
    console.log("Disconnecting " + config.url)
    await Kilt.disconnect()
}

main()
