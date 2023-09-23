import {ethers} from "hardhat";

export const addressZERO = "0x0000000000000000000000000000000000000000"
export const MAX_UINT = String(ethers.BigNumber.from("2").pow(256).sub(1))