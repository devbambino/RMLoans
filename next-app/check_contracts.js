const { ethers } = require('ethers');

const RPC_URL = "https://sepolia.base.org";
const ORACLE_ADDRESS = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const MORPHO_ADDRESS = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const IRM_ADDRESS = "0x46415998764C29aB2a25CbeA6254146D50D22687";

const ORACLE_ABI = ["function price() external view returns (uint256)"];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log("Checking contracts on Base Sepolia...");

    // 1. Check Morpho Code
    const morphoCode = await provider.getCode(MORPHO_ADDRESS);
    console.log(`Morpho Blue deployed? ${morphoCode !== '0x'}`);

    // 2. Check Oracle
    const oracleCode = await provider.getCode(ORACLE_ADDRESS);
    console.log(`Oracle deployed? ${oracleCode !== '0x'}`);

    if (oracleCode !== '0x') {
        try {
            const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
            const price = await oracle.price();
            console.log(`Oracle Price: ${price.toString()}`);
        } catch (e) {
            console.error("Oracle price() reverted:", e.shortMessage || e.message);
        }
    }

    // 3. Check IRM
    const irmCode = await provider.getCode(IRM_ADDRESS);
    console.log(`IRM deployed? ${irmCode !== '0x'}`);

}

main();
