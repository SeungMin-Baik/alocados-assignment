import '@nomiclabs/hardhat-ethers'
import {ethers} from "hardhat"
import {fromUnit, toUnit} from "../utils/formatter";
import {expect} from "chai";
import {Contract} from "ethers";
import {takeSnapshot, revertSnapshot} from "../utils/evm";

describe("Lottery Unit Test", async () => {
    let deployer: any
    let Lottery: Contract
    let snapshotId: any

    beforeEach(async () => {
        snapshotId = await takeSnapshot()
    })

    afterEach(async () => {
        await revertSnapshot(snapshotId)
    })

    before("initialize", async () => {
        [deployer,] = await ethers.getSigners()
        console.log(`deployer: ${deployer.address} (${fromUnit(await ethers.provider.getBalance(deployer.address))} Native)`)

        const LotteryFactory = await ethers.getContractFactory('Lottery')
        Lottery = await LotteryFactory.deploy();
        console.log(`Lottery: ${Lottery.address}`)
    })

    it("", async () => {
    })
})