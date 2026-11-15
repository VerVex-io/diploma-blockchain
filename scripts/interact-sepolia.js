
const {ethers} = require('hardhat');

async function main() {
  const contractAddress = '0x4b3dEc9A800A5a633d94A509d3860996A4706B7f';

  const Diploma = await ethers.getContractFactory('DiplomaCertification');
  const diploma = Diploma.attach(contractAddress);

  console.log('Contract owner:', await diploma.owner());

  // Generate a demo diploma hash
  const hash = ethers.id('demo-diploma-sepolia-2026');

  // Issue a diploma
  const tx = await diploma.emettreDiplome(
      hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026);

  console.log('Transaction sent:', tx.hash);
  await tx.wait();
  console.log('Diploma issued successfully!');

  // Verify the diploma
  const [exists, result] = await diploma.verifierDiplome(hash);

  console.log('Exists:', exists);
  console.log('Student:', result.nomEtudiant);
  console.log('Program:', result.filiere);
  console.log('Year:', result.annee.toString());
  console.log('Valid:', result.valide);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
