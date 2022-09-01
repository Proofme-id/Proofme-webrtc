## Proofme.ID - WebRTC

This package allows easy usage of the WebRTC part as of a lot of utilty functions to check credentials and validity of those

# Node version

# Step 1: Importing the package
```
import { ICredentialObject, IRequestedCredentials, IValidatedCredentials, ProofmeUtils } from "@proofmeid/webrtc-node";
```

# Step 2: Using the library to validate credentials

Below an example of how to pass the credentials and validate them. 
```
const credentialObject: ICredentialObject = req.body.credentials;
if (credentialObject) {
    const requestedData: IRequestedCredentials = {
        by: "Proofme",
        description: "full identification",
        credentials: [
            { key: "PHOTO", provider: "EPASS", required: true },
            { key: "FIRST_NAME", provider: "EPASS", required: true },
            { key: "LAST_NAME", provider: "EPASS", required: true },
            { key: "BIRTH_DATE", provider: "EPASS", required: true },
            { key: "GENDER", provider: "EPASS", required: true },
            { key: "NATIONALITY", provider: "EPASS", required: true },
            { key: "DOCUMENT_NUMBER", provider: "EPASS", required: true },
            { key: "DOCUMENT_EXPIRY_DATE", provider: "EPASS", required: true },
            { key: "DOCUMENT_TYPE", provider: "EPASS", required: true }
        ]
    };
    const proofmeUtils = new ProofmeUtils();
    const validatedCredentials = await proofmeUtils.validCredentialsTrustedPartiesFunc(credentialObject, config.web3Url, requestedData, config.trustedDids as string[], true, true) as IValidatedCredentials;
    if (validatedCredentials.valid) {
        // Do stuff with the credentials as you like
        res.status(200).send({ message: "SUCCESS.VALID_CREDENTIALS", success: true });
    } else {
        res.status(200).send({ message: "ERROR.INVALID_CREDENTIALS", success: false });
    }
} else {
    res.status(400).send({ error: "ERROR.MISSING_CREDENTIAL_OBJECT" });
}
```

Please note that the 'requestedData' object has to match the 'requestedData' in the frontend. We should check the exact same thing that has been asked to the customer. 

The 'ProofmeUtils' class contains a function to validate the credentials, which will return a valid 'true' or valid 'false'.

- Config web3Url (to which blockchain URL to check the issuers), Proofme's: 'https://api.didux.network/'
- Config trustedDids (which issuers are valid), Proofme's: '["0xa6De718CF5031363B40d2756f496E47abBab1515"]'

