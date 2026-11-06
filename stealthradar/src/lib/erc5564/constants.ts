// Canonical ERC-5564 singleton (CREATE2). Presence on a given chain MUST be verified with eth_getCode
// before enabling scanning there.
export const ANNOUNCER_ADDRESS = "0x55649E01B5Df198D18D95b5cc5051630cfD45564" as const;

export const ANNOUNCEMENT_EVENT_ABI = {
  type: "event",
  name: "Announcement",
  inputs: [
    { name: "schemeId", type: "uint256", indexed: true },
    { name: "stealthAddress", type: "address", indexed: true },
    { name: "caller", type: "address", indexed: true },
    { name: "ephemeralPubKey", type: "bytes", indexed: false },
    { name: "metadata", type: "bytes", indexed: false },
  ],
} as const;

export const ANNOUNCER_ABI = [
  ANNOUNCEMENT_EVENT_ABI,
  {
    type: "function",
    name: "announce",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemeId", type: "uint256" },
      { name: "stealthAddress", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// ERC-5564 recommended ETH marker in metadata.
export const ETH_SENTINEL = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
