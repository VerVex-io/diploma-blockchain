
const {ethers} = require('hardhat');

async function main() {
  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const Diploma = await ethers.getContractFactory('DiplomaCertification');

  const diploma = Diploma.attach(contractAddress);

  console.log('Contract owner:', await diploma.owner());

  const hash = ethers.id('my-first-diploma');

  await diploma.emettreDiplome(
      hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026);

  console.log('Diploma issued successfully!');

  const [exists, result] = await diploma.verifierDiplome(hash);

  console.log('Exists:', exists);
  console.log('Student:', result.nomEtudiant);
  console.log('Program:', result.filiere);
  console.log('Year:', result.annee.toString());
  console.log('Valid:', result.valide);
}

main().catch(console.error);
