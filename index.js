const fs = require("fs");
const bs58 = require("bs58");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");

console.log(`\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n~ Verata's Manifest Matcher ~\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`)

console.log(`~ Starting configuration ~`)

// Grab the mint list.
console.log(`Reading mint list`)
const mints = JSON.parse(fs.readFileSync(process.argv[3]));

// Let's piggyback on Metaplex's RPC service.
const connection = new Connection("https://api.metaplex.solana.com/");

// Read the private key. For some reason, Phantom feeds you a base-58 encoded
// private key. We can detect that and process accordingly.
let secretKey;
try {
    secretKey = new Uint8Array(JSON.parse(fs.readFileSync(process.argv[2])));
    console.log(`Detected private key array`)
} catch (e) {
    if (e.message.startsWith(`Unexpected token`) && e.message.endsWith(`in JSON at position 1`)) {
        secretKey = bs58.decode((fs.readFileSync(process.argv[2])).toString());
        console.log(`Detected base-58 encoded private key`)
    } else {
        throw e;
    };
};
const wallet = Keypair.fromSecretKey(secretKey);

// Instantiate the class.
console.log(`Setting up identity`)
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));

console.log(`\n~ Running update loop ~`)
const run = async () => {

    // For each mint in the mint list...
    for (const [index, mint] of mints.entries()) {

        // We'll first fetch the NFT and metadata from the chain.
        const nft = await metaplex.nfts().findByMint(new PublicKey(mint));
        console.log(`(${index + 1}/${mints.length}) — Matching ${nft.name} => ${nft.metadata.name}`);

        // The manifest JSON information is located at nft.metadata. We can simply 
        // run an update on the current NFT so that it matches the manifest name.
        // isMutable should be set to null to prevent an error, this is a known
        // bug and will be fixed in a later iteration of the JS package.
        await metaplex.nfts().update(nft, {
            name: nft.metadata.name,
            isMutable: null
        });

    };

};

run().then(_ => console.log(`Done!`));
