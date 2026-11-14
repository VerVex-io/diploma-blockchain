
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DiplomaCertification is Ownable {

    struct Diplome {
        bytes32 hashPdf;
        string cid;
        string nomEtudiant;
        string filiere;
        uint256 annee;
        uint256 dateEmission;
        bool valide;
    }

    mapping(bytes32 => Diplome) public diplomes;

    event DiplomeEmis(
        bytes32 indexed hashPdf,
        string nomEtudiant,
        uint256 dateEmission
    );

    event DiplomeRevoque(bytes32 indexed hashPdf);

    constructor() Ownable(msg.sender) {}

    function emettreDiplome(
        bytes32 _hashPdf,
        string memory _cid,
        string memory _nomEtudiant,
        string memory _filiere,
        uint256 _annee
    ) public onlyOwner {

        require(_hashPdf != bytes32(0), "Hash invalide");
        require(
    diplomes[_hashPdf].dateEmission == 0,
    "Diplome deja enregistre"
);

        diplomes[_hashPdf] = Diplome({
            hashPdf: _hashPdf,
            cid: _cid,
            nomEtudiant: _nomEtudiant,
            filiere: _filiere,
            annee: _annee,
            dateEmission: block.timestamp,
            valide: true
        });

        emit DiplomeEmis(
            _hashPdf,
            _nomEtudiant,
            block.timestamp
        );
    }

    function verifierDiplome(bytes32 _hashPdf)
        public
        view
        returns (bool, Diplome memory)
    {
        Diplome memory d = diplomes[_hashPdf];

        return (d.dateEmission != 0, d);
    }

    function revoquerDiplome(bytes32 _hashPdf)
        public
        onlyOwner
    {
        require(
            diplomes[_hashPdf].dateEmission != 0,
            "Diplome inexistant"
        );

        require(
            diplomes[_hashPdf].valide,
            "Diplome deja revoque"
        );

        diplomes[_hashPdf].valide = false;

        emit DiplomeRevoque(_hashPdf);
    }
}
