import '@nomiclabs/hardhat-ethers'
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {ethers} from 'hardhat'
import {BigNumber} from 'ethers'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'

const hre: HardhatRuntimeEnvironment = require('hardhat')

/**
 * Block Manipulations
 * */
export const currentTime = async () => {
    const {timestamp} = await ethers.provider.getBlock('latest')
    return timestamp
}

export const currentBlock = async () => {
    return await ethers.provider.getBlockNumber()
}

export const mineBlock = async () => {
    await hre.network.provider.request({method: 'evm_mine'})
    return await currentBlock()
}

export const mineBlockBulk = async (count: number, sync: boolean = true) => {
    const requests = []
    while (count--) {
        if (sync) {
            //@ts-ignore
            requests.push(hre.network.provider.request({method: 'evm_mine'}))
        } else {
            hre.network.provider.request({method: 'evm_mine'})
        }
    }

    if (sync && requests.length > 0) {
        await Promise.all(requests)
    }
    return await currentBlock()
}

export const mine2Hours = async (sync: boolean = true) => {
    const BlockPerHour = 3600
    await mineBlockBulk(BlockPerHour * 2, sync)
}

export const mine24Hours = async (sync: boolean = true) => {
    const BlockPerHour = 3600
    await mineBlockBulk(BlockPerHour * 24, sync)
}

export const mineTo = async (blockNumber: any, sync: boolean = true) => {
    let block = await currentBlock()
    if (block >= blockNumber) return
    let diff = blockNumber - block
    // console.log(`block diff: ${diff}, to: ${blockNumber}`)
    await mineBlockBulk(diff, sync)
}

/**
 *  Increases the time in the EVM.
 *  @param seconds Number of seconds to increase the time by
 */
export const fastForward = async (seconds: any) => {
    if (BigNumber.isBigNumber(seconds)) {
        seconds = seconds.toNumber()
    }

    if (typeof seconds === 'string') {
        seconds = parseInt(seconds)
    }

    await hre.network.provider.request({method: 'evm_increaseTime', params: [seconds]})
    return await mineBlock()
}

export const setNextBlockTime = async (unixTimestamp: any) => {
    if (BigNumber.isBigNumber(unixTimestamp)) {
        unixTimestamp = unixTimestamp.toNumber()
    }

    if (typeof unixTimestamp === 'string') {
        unixTimestamp = parseInt(unixTimestamp)
    }

    await hre.network.provider.request({method: 'evm_setNextBlockTimestamp', params: [unixTimestamp]})
    return await mineBlock()
}


export const fastForwardTo = async (unixTimestamp: any) => {
    if (BigNumber.isBigNumber(unixTimestamp)) {
        unixTimestamp = unixTimestamp.toNumber()
    }

    if (typeof unixTimestamp === 'string') {
        unixTimestamp = parseInt(unixTimestamp)
    }

    if (unixTimestamp instanceof Date) {
        unixTimestamp = Math.floor(unixTimestamp.getTime() / 1000)
    }

    const to = new Date(unixTimestamp * 1000)
    const now = new Date(await currentTime() * 1000)
    if (to < now) throw new Error(`Time parameter (${to}) is less than now ${now}.`)

    const secondsBetween = Math.floor((to.getTime() - now.getTime()) / 1000)
    return await fastForward(secondsBetween)
}

/**
 *  Takes a snapshot and returns the ID of the snapshot for restoring later.
 */
export const takeSnapshot = async () => {
    const result = await hre.network.provider.request({method: 'evm_snapshot'})
    await mineBlock()
    return result
}

/**
 *  Restores a snapshot that was previously taken with takeSnapshot
 *  @param id The ID that was returned when takeSnapshot was called.
 */
export const revertSnapshot = async (id: any) => {
    await hre.network.provider.request({method: 'evm_revert', params: [id]})
    return await mineBlock()
}

/**
 * Get ETH balance
 * */
export const balance = async (account: string) => await ethers.provider.getBalance(account)

/**
 * Transfer ETH balance
 * */
export const sendETH = async (signer: SignerWithAddress, to: string, value: any) => {
    await signer.sendTransaction({
        to: to,
        value: value
    })
}

/**
 * Gas Estimation
 * */
export const estimateGasMargin = async (execution: Promise<BigNumber>): Promise<string> => {
    try {
        const estimatedGas = await execution
        return estimatedGas.mul(150).div(100).toString()
    } catch {
        return '5000000'
    }
}