import { EDIDAccessLevel } from "../../enums/didAccessLevel.enum";
import { Identity } from "../../smartcontracts/identity";
import Web3 from "web3";

export async function checkKeyForDid(web3Url: string, contractAddress: string, publicKey: string, keyToCheck: EDIDAccessLevel): Promise<boolean> {
    try {
        const web3 = new Web3(web3Url);
        const contract = new web3.eth.Contract(Identity.abi, contractAddress);
        const shaAddress = web3.utils.sha3(publicKey);
        return await contract.methods.keyHasPurpose(shaAddress, keyToCheck).call();
    } catch (error) {
        console.log("Library - Something went wrong: " + error);
        return false;
    }
}