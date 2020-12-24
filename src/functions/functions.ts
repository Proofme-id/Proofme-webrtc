import Web3 from "web3";
import { ICheckedDid } from "../interfaces/checkedDid.interface";
import { ICredentialObject } from "../interfaces/credentialsObject.interface";
import { claimHolderAbi } from "../smartcontracts/claimHolderAbi";

export async function validCredentialsFunc(credentialObject: ICredentialObject, web3Url: string) {
    const web3Node = new Web3(web3Url);
    const checkedDid: ICheckedDid[] = [];
    const credentialObjectWithoutProofSignature = JSON.parse(JSON.stringify(credentialObject));
    delete credentialObjectWithoutProofSignature.proof.signature;
    for (const [, credential] of Object.entries(credentialObject.credentials)) {
        if (!credential.version) {
            return {
                valid: false,
                code: 6,
                message: "Incorrect credential version. Renew your credentials"
            }
        }
        const userRecoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialObjectWithoutProofSignature), credentialObject.proof.signature);
        const then = new Date(credentialObject.proof.nonce);
        const now = new Date();
        const minutesDifference = calculateMinutesDifference(now, then);
        console.log("minutesDifference:", minutesDifference);
        if (minutesDifference <= 5) {
            const correctUserSignature = userCredentialSignatureWrong(credentialObject.proof.holder, userRecoveredAddress);
            // Check if the user (Identity App) did sign it correct
            if (correctUserSignature) {
                // Check if the sent credentials were provided by the did of the credential (check the signature of each credential)
                const correctIssuerSignature = issuerCredentialSignatureWrong(credential, web3Node);
                if (correctIssuerSignature) {
                    // Check every credential DID contract if the holder belongs to that DID
                    const issuerHolderKey = credential.proof.holder;
                    const issuerDidContractAddress = credential.issuer.id.split(":")[2];
                    const issuerCorrectDid = await didContractKeyWrong(web3Node, web3Url, claimHolderAbi, issuerHolderKey, issuerDidContractAddress, checkedDid);
                    if (issuerCorrectDid) {
                        const userHolderKey = credentialObject.proof.holder;
                        const userDidContractAddress = credential.id.split(":")[2];
                        const userCorrectDid = await didContractKeyWrong(web3Node, web3Url, claimHolderAbi, userHolderKey, userDidContractAddress, checkedDid);
                        if (userCorrectDid) {
                            return {
                                valid: true,
                                code: 0,
                                message: "Valid credential"
                            }
                        } else {
                            return {
                                valid: false,
                                code: 5,
                                message: "User did incorrect"
                            }
                        }
                    } else {
                        return {
                            valid: false,
                            code: 4,
                            message: "Issuer did incorrect"
                        }
                    }
                } else {
                    return {
                        valid: false,
                        code: 3,
                        message: "Issuer signature incorrect"
                    }
                }
            } else {
                return {
                    valid: false,
                    code: 2,
                    message: "User signature incorrect"
                }
            }
        } else {
            return {
                valid: false,
                code: 1,
                message: "QR code expired"
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function userCredentialSignatureWrong(holderKey: any, recoveredAddress: string) {
    if (holderKey !== recoveredAddress) {
        console.error(`User signature of credential ${holderKey} does not match recoveredAddress ${recoveredAddress}`);
        return false;
    }
    return true;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function issuerCredentialSignatureWrong(credential: any, web3Node: any) {
    const issuerSignature = credential.proof.signature;
    const credentialIssuerKey = credential.proof.holder;
    const credentialWithoutIssuerProof = JSON.parse(JSON.stringify(credential));
    delete credentialWithoutIssuerProof.proof.signature;
    const recoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialWithoutIssuerProof), issuerSignature);
    if (credentialIssuerKey !== recoveredAddress) {
        console.error(`Issuer signature of credential ${credentialIssuerKey} does not match recoveredAddress ${recoveredAddress}`);
        return false;
    }
    return true;
}

export async function didContractKeyWrong(web3Node: any, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean> {
    const foundEntry = checkedDid.find(x => x.did == didAddress && x.holderKey === holderKey);
    if (foundEntry) {
        console.log("Already found entry! Returning:", foundEntry.result);
        return foundEntry.result;
    } else {
        const knownAddresses = [];

        if (didAddress === holderKey) {
            console.log("NO need to check DID contract");
            checkedDid.push({ did: didAddress, holderKey, result: true });
            return true;
        } else {
            console.log("YES need to check DID contract");
            const sha3Key = getSha3Key(holderKey, web3Node);
            const web3 = new Web3(web3Url);
            const keyManagerContract = new web3.eth.Contract(
                claimHolderAbi,
                didAddress
            );
            if (!knownAddressesContains(knownAddresses, sha3Key, didAddress)) {
                const keyPurpose = parseInt(await getKeyPurpose(keyManagerContract, sha3Key), 10);
                console.log("keyPurpose:", keyPurpose);
                // keyPurpose 1 = Owner
                // keyPurpose 2 = Action Key
                // keyPurpose 3 = Claim Signer Key 
                // keyPurpose 4 = Encryption key
                if (keyPurpose === 0 || keyPurpose > 3) {
                    checkedDid.push({ did: didAddress, holderKey, result: false });
                    return false;
                }
                knownAddresses.push({sha3Key, didAddress});
            }
            checkedDid.push({ did: didAddress, holderKey, result: true });
            return true;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string) {
    for (const listItem of list) {
        if (listItem.sha3Key === sha3Key && listItem.didContractAddress === didContractAddress) {
            return true;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getSha3Key(key: string, web3Node: any) {
    return web3Node.utils.keccak256(key);
}

export async function getKeyPurpose(keyManagerContract: any, key: string): Promise<string> {
    // Get Events
    if (keyManagerContract.options.address === null) {
        return Promise.resolve("-1");
    } else {
        return await keyManagerContract.methods.getKeyPurpose(key).call();
    }
}

export function calculateMinutesDifference(dt2: Date, dt1: Date): number  {
    let diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
}