import { AbiItem } from 'web3-utils/types';

export let claimHolderAbi: AbiItem[] = [
    {
        constant: true,
        inputs: [
            {
                name: '_key',
                type: 'bytes32'
            }
        ],
        name: 'getKeyPurpose',
        outputs: [
            {
                name: 'purpose',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                name: '_key',
                type: 'bytes32'
            }
        ],
        name: 'getKey',
        outputs: [
            {
                name: 'purpose',
                type: 'uint256'
            },
            {
                name: 'keyType',
                type: 'uint256'
            },
            {
                name: 'key',
                type: 'bytes32'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_key',
                type: 'bytes32'
            },
            {
                name: '_purpose',
                type: 'uint256'
            },
            {
                name: '_type',
                type: 'uint256'
            }
        ],
        name: 'addKey',
        outputs: [
            {
                name: 'success',
                type: 'bool'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                name: '_claimType',
                type: 'uint256'
            }
        ],
        name: 'getClaimIdsByType',
        outputs: [
            {
                name: 'claimIds',
                type: 'bytes32[]'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_claimId',
                type: 'bytes32'
            }
        ],
        name: 'removeClaim',
        outputs: [
            {
                name: 'success',
                type: 'bool'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_id',
                type: 'uint256'
            },
            {
                name: '_approve',
                type: 'bool'
            }
        ],
        name: 'approve',
        outputs: [
            {
                name: 'success',
                type: 'bool'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_key',
                type: 'bytes32'
            }
        ],
        name: 'removeKey',
        outputs: [
            {
                name: 'success',
                type: 'bool'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                name: '_purpose',
                type: 'uint256'
            }
        ],
        name: 'getKeysByPurpose',
        outputs: [
            {
                name: '_keys',
                type: 'bytes32[]'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_claimType',
                type: 'uint256'
            },
            {
                name: '_scheme',
                type: 'uint256'
            },
            {
                name: '_issuer',
                type: 'address'
            },
            {
                name: '_signature',
                type: 'bytes'
            },
            {
                name: '_data',
                type: 'bytes'
            },
            {
                name: '_uri',
                type: 'string'
            }
        ],
        name: 'addClaim',
        outputs: [
            {
                name: 'claimRequestId',
                type: 'bytes32'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: false,
        inputs: [
            {
                name: '_to',
                type: 'address'
            },
            {
                name: '_value',
                type: 'uint256'
            },
            {
                name: '_data',
                type: 'bytes'
            }
        ],
        name: 'execute',
        outputs: [
            {
                name: 'executionId',
                type: 'uint256'
            }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                name: '_claimId',
                type: 'bytes32'
            }
        ],
        name: 'getClaim',
        outputs: [
            {
                name: 'claimType',
                type: 'uint256'
            },
            {
                name: 'scheme',
                type: 'uint256'
            },
            {
                name: 'issuer',
                type: 'address'
            },
            {
                name: 'signature',
                type: 'bytes'
            },
            {
                name: 'data',
                type: 'bytes'
            },
            {
                name: 'uri',
                type: 'string'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        constant: true,
        inputs: [
            {
                name: '_key',
                type: 'bytes32'
            },
            {
                name: '_purpose',
                type: 'uint256'
            }
        ],
        name: 'keyHasPurpose',
        outputs: [
            {
                name: 'result',
                type: 'bool'
            }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'claimRequestId',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'claimType',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'scheme',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'issuer',
                type: 'address'
            },
            {
                indexed: false,
                name: 'signature',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'uri',
                type: 'string'
            }
        ],
        name: 'ClaimRequested',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'claimId',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'claimType',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'issuer',
                type: 'address'
            },
            {
                indexed: false,
                name: 'signatureType',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'signature',
                type: 'bytes32'
            },
            {
                indexed: false,
                name: 'claim',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'uri',
                type: 'string'
            }
        ],
        name: 'ClaimAdded',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'claimId',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'claimType',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'scheme',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'issuer',
                type: 'address'
            },
            {
                indexed: false,
                name: 'signature',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'uri',
                type: 'string'
            }
        ],
        name: 'ClaimAdded',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'claimId',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'claimType',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'scheme',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'issuer',
                type: 'address'
            },
            {
                indexed: false,
                name: 'signature',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'uri',
                type: 'string'
            }
        ],
        name: 'ClaimRemoved',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'claimId',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'claimType',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'scheme',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'issuer',
                type: 'address'
            },
            {
                indexed: false,
                name: 'signature',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            },
            {
                indexed: false,
                name: 'uri',
                type: 'string'
            }
        ],
        name: 'ClaimChanged',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'executionId',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'to',
                type: 'address'
            },
            {
                indexed: true,
                name: 'value',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'ExecutionFailed',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'key',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'purpose',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'keyType',
                type: 'uint256'
            }
        ],
        name: 'KeyAdded',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'key',
                type: 'bytes32'
            },
            {
                indexed: true,
                name: 'purpose',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'keyType',
                type: 'uint256'
            }
        ],
        name: 'KeyRemoved',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'executionId',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'to',
                type: 'address'
            },
            {
                indexed: true,
                name: 'value',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'ExecutionRequested',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'executionId',
                type: 'uint256'
            },
            {
                indexed: true,
                name: 'to',
                type: 'address'
            },
            {
                indexed: true,
                name: 'value',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'Executed',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'executionId',
                type: 'uint256'
            },
            {
                indexed: false,
                name: 'approved',
                type: 'bool'
            }
        ],
        name: 'Approved',
        type: 'event'
    }
];
