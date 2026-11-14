
const {expect} = require('chai');
const {ethers} = require('hardhat');

describe('DiplomaCertification', function() {
  let diploma;
  let owner;
  let user;

  const hash = ethers.id('diploma-test-001');

  beforeEach(async function() {
    [owner, user] = await ethers.getSigners();

    const Diploma = await ethers.getContractFactory('DiplomaCertification');

    diploma = await Diploma.deploy();
    await diploma.waitForDeployment();
  });

  describe('Deployment', function() {
    it('Should set the owner correctly', async function() {
      expect(await diploma.owner()).to.equal(owner.address);
    });
  });

  describe('Issuing diplomas', function() {
    it('Should allow owner to issue a diploma', async function() {
      await diploma.emettreDiplome(
          hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026);

      const [exists, result] = await diploma.verifierDiplome(hash);

      expect(exists).to.equal(true);
      expect(result.nomEtudiant).to.equal('Ahmed Ben Ali');
      expect(result.filiere).to.equal('Informatique');
      expect(result.annee).to.equal(2026);
      expect(result.valide).to.equal(true);
    });

    it('Should reject issuance by another user', async function() {
      await expect(
          diploma.connect(user).emettreDiplome(
              hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026))
          .to.be.revertedWithCustomError(diploma, 'OwnableUnauthorizedAccount');
    });

    it('Should reject duplicate diplomas', async function() {
      await diploma.emettreDiplome(
          hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026);

      await expect(
          diploma.emettreDiplome(
              hash, 'QmTest456', 'Ahmed Ben Ali', 'Informatique', 2026))
          .to.be.revertedWith('Diplome deja enregistre');
    });
  });

  describe('Verifying diplomas', function() {
    it('Should return false for an unknown diploma', async function() {
      const unknownHash = ethers.id('unknown');

      const [exists] = await diploma.verifierDiplome(unknownHash);

      expect(exists).to.equal(false);
    });
  });

  describe('Revoking diplomas', function() {
    beforeEach(async function() {
      await diploma.emettreDiplome(
          hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026);
    });

    it('Should prevent reissuing a revoked diploma', async function() {
      await diploma.revoquerDiplome(hash);

      await expect(
          diploma.emettreDiplome(
              hash, 'QmTest123', 'Ahmed Ben Ali', 'Informatique', 2026))
          .to.be.revertedWith('Diplome deja enregistre');
    });

    it('Should allow owner to revoke a diploma', async function() {
      await diploma.revoquerDiplome(hash);

      const [exists, result] = await diploma.verifierDiplome(hash);

      expect(exists).to.equal(true);
      expect(result.valide).to.equal(false);
    });

    it('Should reject revocation by another user', async function() {
      await expect(diploma.connect(user).revoquerDiplome(hash))
          .to.be.revertedWithCustomError(diploma, 'OwnableUnauthorizedAccount');
    });

    it('Should reject revoking an unknown diploma', async function() {
      await expect(diploma.revoquerDiplome(ethers.id('unknown')))
          .to.be.revertedWith('Diplome inexistant');
    });
  });
});
