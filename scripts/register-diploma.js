
const {ethers} = require('hardhat');

async function main() {
  const contractAddress = '0x4b3dEc9A800A5a633d94A509d3860996A4706B7f';

  const hash =
      '0x10F86249FDE4EFD78223704B94D1A8520A18DFC3B8E92EF8686FC4866B32A28E';

  const cid = 'bafybeiba5fvaa4aidtazbm3hy5xka72cmzt77m5vgsj56zx5dtmbofqhvi';

  const Diploma = await ethers.getContractFactory('DiplomaCertification');

  const diploma = Diploma.attach(contractAddress);

  // Confirm contract exists on Sepolia
  const code = await ethers.provider.getCode(contractAddress);

  if (code === '0x') {
    throw new Error('No contract found at this address on Sepolia.');
  }

  console.log('Contract found on Sepolia!');
  console.log('Owner:', await diploma.owner());

  // Check whether this PDF is already registered
  const [exists] = await diploma.verifierDiplome(hash);

  if (exists) {
    console.log('This diploma is already registered.');
    return;
  }

  // Register diploma
  const tx = await diploma.emettreDiplome(
      hash, cid, 'Ahmed Ben Ali', 'Informatique', 2026);

  console.log('Transaction sent:', tx.hash);

  await tx.wait();

  console.log('Diploma registered successfully!');

  // Verify registration
  const [registered, result] = await diploma.verifierDiplome(hash);

  console.log('Exists:', registered);
  console.log('Student:', result.nomEtudiant);
  console.log('Program:', result.filiere);
  console.log('Year:', result.annee.toString());
  console.log('CID:', result.cid);
  console.log('Valid:', result.valide);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
