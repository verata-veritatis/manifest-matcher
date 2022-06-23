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

// Function for async sleep.
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to update metadata. Since Solana likes to throw a lot of errors at times,
// we need to force retry on error, and keep retrying.
const update = async (entry) => {

    // Deconstruct the incoming argument.
    const [index, mint] = entry;

    // We'll first fetch the NFT and metadata from the chain.
    const nft = await metaplex.nfts().findByMint(new PublicKey(mint));

    // Check to see if the name matches.
    if (nft.name === nft.metadata.name) {
        console.log(`(${index + 1}/${mints.length}) — (${mint})\n    ↳ Name is already matching`);
        return false;
    } else {
        console.log(`(${index + 1}/${mints.length}) — (${mint})\n    ↳ Matching ${nft.name} => ${nft.metadata.name}`);
    }

    // The manifest JSON information is located at nft.metadata. We can simply 
    // run an update on the current NFT so that it matches the manifest name.
    // isMutable should be set to null to prevent an error, this is a known
    // bug and will be fixed in a later iteration of the JS package.
    while (true) {
        try {
            await metaplex.nfts().update(nft, {
                name: nft.metadata.name,
                isMutable: null
            });
            console.log(`(${index + 1}/${mints.length}) — (${mint})\n    ↳ Matching complete`);
            break;
        } catch (e) {
            console.log(`(${index + 1}/${mints.length}) — (${mint})\n    ↳ ${e}`);
            continue;
        }
    }
    return true;

}

console.log(`\n~ Running update loop ~`)
const run = async () => {

    // For each mint in the mint list...
    for (const entry of mints.entries()) {

        // Update. We don't need to await, since this will take a while, so we run 
        // multiple updates concurrently.
        update(entry);

        // This is where we determine the amount of time to wait
        // between iterations. Default is 1 second.
        await sleep(process.argv[4] || 1000);

    };

};

run().then(_ => console.log(`Done!`));
