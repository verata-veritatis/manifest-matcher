# manifest-matcher
A simple script for Solana NFTs to force-match the metadata name to the manifest name.

The existing NFT's metadata and manifest is first fetched, then the manifest name is compared to the metadata name. If the metadata name doesn't match the manifest name, the metadata name is updated to match.

The script requires a standard wallet JSON file (containing the private key as a Uint8Array or base-58 encoded string) and an Array of mint hashes (as strings) as a JSON file. The delay between iterations (or update transactions) is optional and defaults to 1000 ms.

```
npm i
node index.js <PATH TO WALLET> <PATH TO MINTS ARRAY> <DELAY, DEFAULT = 1000 MS>
```
