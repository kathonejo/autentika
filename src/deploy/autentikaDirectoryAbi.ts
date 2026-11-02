export const AUTENTIKA_DIRECTORY_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "autentikaV2",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_REQUEST_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "artistCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "autentika",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IAutentikaV2Views"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "bindTokenToCommission",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "commissionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelRequest",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getArtistListing",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AutentikaDirectory.ArtistListing",
        "components": [
          {
            "name": "bio",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "basePriceUsdc",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pitch",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "registered",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "registeredAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getArtists",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCommissionIdForToken",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPhysicalByCommission",
    "inputs": [
      {
        "name": "commissionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AutentikaDirectory.PhysicalRecord",
        "components": [
          {
            "name": "accompaniesPhysical",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "redeemed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "shipped",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "artist",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "redeemedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "shippedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRequest",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AutentikaDirectory.CommissionRequest",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "collector",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "artist",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "message",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "createdAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "cancelled",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRequestsFromCollector",
    "inputs": [
      {
        "name": "collector",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRequestsToArtist",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isArtistRegistered",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "markShipped",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "redeemPhysical",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerArtist",
    "inputs": [
      {
        "name": "bio",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "basePriceUsdc",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "pitch",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestCommission",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "message",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPhysicalForCommission",
    "inputs": [
      {
        "name": "commissionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "accompanies",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ArtistRegistered",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "basePriceUsdc",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ArtistUpdated",
    "inputs": [
      {
        "name": "artist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "basePriceUsdc",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CommissionRequestCancelled",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CommissionRequested",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "collector",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "artist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "message",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PhysicalFlagSet",
    "inputs": [
      {
        "name": "commissionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "artist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "accompanies",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PhysicalRedeemed",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "commissionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "collector",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PhysicalShipped",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "commissionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "artist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyCancelled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyRedeemed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyShipped",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CommissionNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MessageTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoPhysical",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTokenOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  }
] as const
