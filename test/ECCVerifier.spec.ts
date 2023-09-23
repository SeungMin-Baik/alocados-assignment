import '@nomiclabs/hardhat-ethers'
import {ethers} from "hardhat"
import {fromUnit, toUnit} from "../utils/formatter";
import {expect} from "chai";
import {Contract, Wallet} from "ethers";
import {takeSnapshot, revertSnapshot, fastForward} from "../utils/evm";
import {addressZERO, MAX_UINT} from "../utils/constant";
import {signedMessage} from "../scripts/signedMessage";

describe("ECCVerifier Unit Test", async () => {
    let deployer: any
    let ECCVerifier: Contract, TestToken: Contract
    let snapshotId: any
    let _messageHash: string, _bytesSignature: Uint8Array, _user: any, _signatureHash: string

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

        const ECCVerifierFactory = await ethers.getContractFactory('ECCVerifier')
        ECCVerifier = await ECCVerifierFactory.deploy([TestToken.address]);
        console.log(`ECCVerifier: ${ECCVerifier.address}`)

        await TestToken.mint(deployer.address, toUnit(1000))

        expect(await TestToken.balanceOf(deployer.address)).to.equal(toUnit(1000))

        await TestToken.approve(ECCVerifier.address, MAX_UINT)
        const {messageHash, bytesSignature, wallet, signatureHash} = await signedMessage()

        _messageHash = messageHash;
        _bytesSignature = bytesSignature
        _user = wallet;
        _signatureHash = signatureHash;

        await TestToken.mint(_user.address, toUnit(1000))

        await deployer.sendTransaction({to: _user.address, value: toUnit(5000)})
        console.log(`_user: ${_user.address} (${fromUnit(await ethers.provider.getBalance(_user.address))} Native)`)

        await TestToken.connect(_user).approve(ECCVerifier.address, MAX_UINT)
    })

    it("deposit ETH", async () => {
        await ECCVerifier.connect(_user).deposit(_messageHash, _bytesSignature, addressZERO, 0, {value: toUnit(10)})

        expect(await ECCVerifier.connect(_user).balances(_user.address, addressZERO)).to.equal(toUnit(10))
    })

    it("deposit ERC20", async () => {
        await ECCVerifier.connect(_user).deposit(_messageHash, _bytesSignature, TestToken.address, toUnit(10))

        expect(await ECCVerifier.connect(_user).balances(_user.address, TestToken.address)).to.equal(toUnit(10))

        console.log(await ECCVerifier.signatures(_signatureHash))
    })

    it('withdraw ETH', async () => {
        await ECCVerifier.connect(_user).deposit(_messageHash, _bytesSignature, addressZERO, 0, {value: toUnit(10)})

        expect(await ECCVerifier.balances(_user.address, addressZERO)).to.equal(toUnit(10))
        expect(await ethers.provider.getBalance(ECCVerifier.address)).to.equal(toUnit(10))

        expect(await ECCVerifier.connect(_user).balances(_user.address, addressZERO)).to.equal(toUnit(10))

        await ECCVerifier.connect(_user).withdraw(_signatureHash, addressZERO)

        expect(await ECCVerifier.balances(_user.address, addressZERO)).to.equal(0)
        expect(await ethers.provider.getBalance(ECCVerifier.address)).to.equal(0)
    })

    it('withdraw ERC20', async () => {
        await ECCVerifier.connect(_user).deposit(_messageHash, _bytesSignature, TestToken.address, toUnit(10))

        expect(await ECCVerifier.balances(_user.address, TestToken.address)).to.equal(toUnit(10))

        expect(await ECCVerifier.connect(_user).balances(_user.address, TestToken.address)).to.equal(toUnit(10))

        await ECCVerifier.connect(_user).withdraw(_signatureHash, TestToken.address)

        expect(await ECCVerifier.balances(_user.address, TestToken.address)).to.equal(0)
    })
})