import '@nomiclabs/hardhat-ethers'
import {ethers} from "hardhat"
import {fromUnit, toUnit} from "../utils/formatter";
import {expect} from "chai";
import {Contract} from "ethers";
import {takeSnapshot, revertSnapshot, fastForward} from "../utils/evm";
import {addressZERO, MAX_UINT} from "../utils/constant";

describe("Bank Unit Test", async () => {
    let deployer: any
    let Bank: Contract, TestToken: Contract
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

        const TestTokenFactory = await ethers.getContractFactory('TestToken')
        TestToken = await TestTokenFactory.deploy('Test Alocaods', 'ACD');
        console.log(`TestToken: ${TestToken.address}`)

        const BankFactory = await ethers.getContractFactory('Bank')
        Bank = await BankFactory.deploy([TestToken.address]);
        console.log(`Bank: ${Bank.address}`)

        await deployer.sendTransaction({to: Bank.address, value: toUnit(1000)})
        await TestToken.mint(Bank.address, toUnit(1000))
        await TestToken.mint(deployer.address, toUnit(1000))

        expect(await ethers.provider.getBalance(Bank.address)).to.equal(toUnit(1000))
        expect(await TestToken.balanceOf(Bank.address)).to.equal(toUnit(1000))
        expect(await TestToken.balanceOf(deployer.address)).to.equal(toUnit(1000))
    })

    describe("Deposit", async () => {
        let unitSnapshot: any;
        let beforeETHBalance: any;
        let beforeTokenBalance: any;
        let beforeETHTimestamp: any;
        let beforeTokenTimestamp: any;
        let beforeBankBalance: any;

        before("initialize", async () => {
            unitSnapshot = await takeSnapshot()

            beforeBankBalance = await ethers.provider.getBalance(Bank.address)
            beforeETHBalance = await Bank.balances(deployer.address, addressZERO)
            beforeTokenBalance = await Bank.balances(deployer.address, TestToken.address)
            beforeETHTimestamp = await Bank.lastDepositTimestamp(deployer.address, addressZERO)
            beforeTokenTimestamp = await Bank.lastDepositTimestamp(deployer.address, TestToken.address)

            expect(beforeETHBalance).to.equal(0)
            expect(beforeTokenBalance).to.equal(0)
            expect(beforeETHTimestamp).to.equal(0)
            expect(beforeTokenTimestamp).to.equal(0)

            await TestToken.approve(Bank.address, MAX_UINT)
        })

        after("revert initialize", async () => {
            await revertSnapshot(unitSnapshot)
        })

        it("Deposit ETH", async () => {
            await Bank.deposit(addressZERO, 0, {value: toUnit(100)})

            const afterBankBalance = await ethers.provider.getBalance(Bank.address)
            const afterETHBalance = await Bank.balances(deployer.address, addressZERO)
            const afterTokenBalance = await Bank.balances(deployer.address, TestToken.address)
            const afterETHTimestamp = await Bank.lastDepositTimestamp(deployer.address, addressZERO)
            const afterTokenTimestamp = await Bank.lastDepositTimestamp(deployer.address, TestToken.address)

            expect(afterBankBalance).to.equal(toUnit(1100))
            expect(Number(fromUnit(afterETHBalance)) - Number(fromUnit(beforeETHBalance))).to.equal(100)
            expect(afterTokenBalance).to.equal(0)
            expect(afterETHTimestamp).to.not.equal(0)
            expect(afterTokenTimestamp).to.equal(0)
        })

        it("Deposit ERC20", async () => {
            await Bank.deposit(TestToken.address, toUnit(100))

            const afterBankBalance = await ethers.provider.getBalance(Bank.address)
            const afterETHBalance = await Bank.balances(deployer.address, addressZERO)
            const afterTokenBalance = await Bank.balances(deployer.address, TestToken.address)
            const afterETHTimestamp = await Bank.lastDepositTimestamp(deployer.address, addressZERO)
            const afterTokenTimestamp = await Bank.lastDepositTimestamp(deployer.address, TestToken.address)

            expect(afterBankBalance).to.equal(beforeBankBalance)
            expect(afterETHBalance).to.equal(0)
            expect(Number(fromUnit(afterTokenBalance)) - Number(fromUnit(beforeTokenBalance))).to.equal(100)
            expect(afterETHTimestamp).to.equal(0)
            expect(afterTokenTimestamp).to.not.equal(0)
        })

        it("amountOf", async () => {
            await Bank.deposit(TestToken.address, toUnit(100))

            const amount = await Bank.amountOf(deployer.address, TestToken.address)

            expect(amount).to.equal(toUnit(100))
        })

        it("Multi Deposit", async () => {
            await Bank.deposit(TestToken.address, toUnit(100))
            await Bank.deposit(TestToken.address, toUnit(100))

            const afterTokenBalance = await Bank.balances(deployer.address, TestToken.address)

            expect(Number(fromUnit(afterTokenBalance)) - Number(fromUnit(beforeTokenBalance))).to.equal(200)
        })
    })

    describe("Withdraw", async () => {
        let unitSnapshot: any;
        let beforeBankBalance: any;
        let beforeBankTokenBalance: any;
        const day = 60 * 60 * 24

        before("initialize", async () => {
            unitSnapshot = await takeSnapshot()

            await TestToken.approve(Bank.address, MAX_UINT)

            await Bank.deposit(addressZERO, 0, {value: toUnit(100)})
            await Bank.deposit(TestToken.address, toUnit(100))

            expect(await ethers.provider.getBalance(Bank.address)).to.equal(toUnit(1100))
            expect(await Bank.balances(deployer.address, addressZERO)).to.equal(toUnit(100))
            expect(await Bank.balances(deployer.address, TestToken.address)).to.equal(toUnit(100))

            beforeBankBalance = await ethers.provider.getBalance(Bank.address)
            beforeBankTokenBalance = await TestToken.balanceOf(Bank.address)
        })

        after("revert initialize", async () => {
            await revertSnapshot(unitSnapshot)
        })

        it("rewards", async () => {
            let rewards

            await fastForward(day)

            rewards = await Bank.rewards(deployer.address, TestToken.address)

            expect(100 + Number(fromUnit(rewards))).to.equal(102)

            await fastForward(day)

            rewards = await Bank.rewards(deployer.address, TestToken.address)

            expect(100 + Number(fromUnit(rewards))).to.equal(104.04)
        })

        it("Withdraw ETH", async () => {
            await fastForward(day)

            await Bank.withdraw(addressZERO)

            const afterBankBalance = await ethers.provider.getBalance(Bank.address)

            expect(Number(fromUnit(beforeBankBalance)) - Number(fromUnit(afterBankBalance))).to.equal(102)
        })

        it("Withdraw Token", async () => {
            await fastForward(day)

            await Bank.withdraw(TestToken.address)

            const afterBankTokenBalance = await TestToken.balanceOf(Bank.address)

            expect(Number(fromUnit(beforeBankTokenBalance)) - Number(fromUnit(afterBankTokenBalance))).to.equal(102)
        })
    })
})