import {Wallet, utils} from 'ethers'
import {ethers} from "hardhat"

export async function signedMessage() {
    const randomWallet = Wallet.createRandom();

    const wallet = randomWallet.connect(ethers.provider);

    const message = "test"

    const messageHash = utils.hashMessage(message)

    const signeMessage = await wallet.signMessage(message)
    const bytesSignature = ethers.utils.arrayify(signeMessage);
    const signatureHash = ethers.utils.keccak256(bytesSignature);

    return {messageHash, bytesSignature, wallet, signatureHash}

}