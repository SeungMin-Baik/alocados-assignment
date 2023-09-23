import '@nomiclabs/hardhat-ethers'
import {ethers} from "hardhat"
import {fromUnit, toUnit} from "../utils/formatter";
import {expect} from "chai";
import {Contract} from "ethers";
import {takeSnapshot, revertSnapshot} from "../utils/evm";

describe("Lottery Unit Test", async () => {
    let deployer: any, user1: any, user2: any
    let Lottery: Contract
    let snapshotId: any

    beforeEach(async () => {
        snapshotId = await takeSnapshot()
    })

    afterEach(async () => {
        await revertSnapshot(snapshotId)
    })

    before("initialize", async () => {
        [deployer, user1, user2] = await ethers.getSigners()
        console.log(`deployer: ${deployer.address} (${fromUnit(await ethers.provider.getBalance(deployer.address))} Native)`)

        const LotteryFactory = await ethers.getContractFactory('Lottery')
        Lottery = await LotteryFactory.deploy();
        console.log(`Lottery: ${Lottery.address}`)

        await Lottery.lottery()

        expect(await Lottery.manager()).to.equal(deployer.address)
    })

    describe("enter", async () => {
        let unitSnapshot: any;

        before("initialize", async () => {
            unitSnapshot = await takeSnapshot()
        })

        after("revert initialize", async () => {
            await revertSnapshot(unitSnapshot)
        })

        it("Common enter", async () => {
            await Lottery.enter({value: toUnit(1)})

            const players = await Lottery.players(0);

            expect(players).to.equal(deployer.address)
        })

        it("Multi enter", async () => {
            await Lottery.enter({value: toUnit(1)})
            await Lottery.enter({value: toUnit(1)})
            await Lottery.enter({value: toUnit(1)})
            await Lottery.connect(user1).enter({value: toUnit(1)})

            const player1 = await Lottery.players(0);
            const player2 = await Lottery.players(1);
            const player3 = await Lottery.players(2);
            const player4 = await Lottery.players(3);

            expect(player1).to.equal(deployer.address)
            expect(player2).to.equal(deployer.address)
            expect(player3).to.equal(deployer.address)
            expect(player4).to.equal(user1.address)
        })
    })

    describe("pickWinner", async () => {
        let unitSnapshot: any;

        before("initialize", async () => {
            unitSnapshot = await takeSnapshot()
        })

        after("revert initialize", async () => {
            await revertSnapshot(unitSnapshot)
        })

        it("pickWinner more than 2", async () => {
            await Lottery.enter({value: toUnit(1)})
            await Lottery.connect(user1).enter({value: toUnit(1)})
            await Lottery.connect(user2).enter({value: toUnit(1)})
            await Lottery.enter({value: toUnit(3)})

            expect(await Lottery.players(0)).to.equal(deployer.address)
            expect(await Lottery.players(1)).to.equal(user1.address)
            expect(await Lottery.players(2)).to.equal(user2.address)
            expect(await Lottery.players(3)).to.equal(deployer.address)

            console.log('before deployer balance :', await ethers.provider.getBalance(deployer.address))
            console.log('before user1 balance :', await ethers.provider.getBalance(user1.address))
            console.log('before user2 balance :', await ethers.provider.getBalance(user2.address))

            await Lottery.pickWinner()

            expect(await ethers.provider.getBalance(Lottery.address)).to.equal(0)

            console.log('after deployer balance :', await ethers.provider.getBalance(deployer.address))
            console.log('after user1 balance :', await ethers.provider.getBalance(user1.address))
            console.log('after user2 balance :', await ethers.provider.getBalance(user2.address))
        })

        it("pickWinner equal 2", async () => {
            await Lottery.enter({value: toUnit(1)})
            await Lottery.connect(user1).enter({value: toUnit(1)})

            expect(await Lottery.players(0)).to.equal(deployer.address)
            expect(await Lottery.players(1)).to.equal(user1.address)

            console.log('before deployer balance :', await ethers.provider.getBalance(deployer.address))
            console.log('before user1 balance :', await ethers.provider.getBalance(user1.address))

            await Lottery.pickWinner()

            expect(await ethers.provider.getBalance(Lottery.address)).to.equal(0)

            console.log('after deployer balance :', await ethers.provider.getBalance(deployer.address))
            console.log('after user1 balance :', await ethers.provider.getBalance(user1.address))
        })

        it("pickWinner only 1", async () => {
            await Lottery.enter({value: toUnit(1)})

            expect(await Lottery.players(0)).to.equal(deployer.address)

            console.log('before deployer balance :', await ethers.provider.getBalance(deployer.address))

            await Lottery.pickWinner()

            expect(await ethers.provider.getBalance(Lottery.address)).to.equal(0)

            console.log('after deployer balance :', await ethers.provider.getBalance(deployer.address))
        })
    })
})