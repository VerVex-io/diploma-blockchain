
const {ethers} = require('hardhat');

async function main() {
  console.log('Deploying DiplomaCertification...');

  const [deployer] = await ethers.getSigners();

  console.log('Deployer address:', deployer.address);

  const Diploma = await ethers.getContractFactory('DiplomaCertification');

  const diploma = await Diploma.deploy();

  await diploma.waitForDeployment();

  const address = await diploma.getAddress();

  console.log('--------------------------------');
  console.log('Deployment successful!');
  console.log('Contract address:', address);
  console.log('--------------------------------');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
