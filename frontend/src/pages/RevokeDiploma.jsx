
import { useState } from "react";
import { ethers } from "ethers";
import { FileText, ShieldAlert, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import contractArtifact from "../contract/DiplomaCertification.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const SEPOLIA_CHAIN_ID = 11155111n;

async function calculateSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

  return (
    "0x" +
    Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

export default function RevokeDiploma() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState(null);
  const [transactionHash, setTransactionHash] = useState("");

  async function handleRevoke(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRecord(null);
    setTransactionHash("");

    if (!file) {
      setError("Select the original diploma PDF first.");
      return;
    }

    if (file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (!window.ethereum) {
      setError("MetaMask was not detected.");
      return;
    }

    if (!CONTRACT_ADDRESS) {
      setError("Contract address is missing from frontend/.env.");
      return;
    }

    setLoading(true);

    try {
      // 1. Calculate the original PDF hash.
      setMessage("Calculating PDF hash...");
      const hash = await calculateSHA256(file);

      // 2. Connect the university admin wallet.
      setMessage("Connecting to MetaMask...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error("Please switch MetaMask to Ethereum Sepolia.");
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        signer
      );

      // 3. Check that the connected wallet is the contract owner.
      const owner = await contract.owner();

      if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Access denied: only the university admin can revoke diplomas.");
      }

      // 4. Retrieve the diploma record.
      setMessage("Searching for diploma on the blockchain...");
      const [exists, diploma] = await contract.verifierDiplome(hash);

      if (!exists) {
        throw new Error("This diploma is not registered on the blockchain.");
      }

      setRecord({
        hash,
        studentName: diploma.nomEtudiant,
        program: diploma.filiere,
        year: Number(diploma.annee),
        valid: diploma.valide,
      });

      if (!diploma.valide) {
        setMessage("This diploma has already been revoked.");
        return;
      }

      // 5. Ask the admin to confirm the revocation transaction.
      setMessage("Waiting for MetaMask transaction approval...");
      const transaction = await contract.revoquerDiplome(hash);

      setTransactionHash(transaction.hash);
      setMessage("Revocation submitted. Waiting for confirmation...");

      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("The revocation transaction failed.");
      }

      // 6. Read the record again to confirm its new status.
      const [stillExists, updatedDiploma] =
        await contract.verifierDiplome(hash);

      if (!stillExists || updatedDiploma.valide) {
        throw new Error("Transaction confirmed, but the updated status could not be verified.");
      }

      setRecord({
        hash,
        studentName: updatedDiploma.nomEtudiant,
        program: updatedDiploma.filiere,
        year: Number(updatedDiploma.annee),
        valid: updatedDiploma.valide,
      });

      setMessage("Diploma successfully revoked on Ethereum Sepolia!");
    } catch (err) {
      console.error("Diploma revocation error:", err);
      setError(
        err.shortMessage ||
        err.reason ||
        err.message ||
        "Revocation failed."
      );
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Revoke Diploma
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administratively revoke a diploma registered on Ethereum Sepolia.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-600" size={22} />
          <div>
            <h2 className="font-semibold text-amber-900">
              University administrator access
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Revocation is permanent in this contract. The diploma record
              remains on-chain, but its validity changes to false.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleRevoke}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="font-semibold text-slate-900">
            Select diploma to revoke
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the exact original PDF used when issuing the diploma.
          </p>
        </div>

        <label
          htmlFor="revoke-file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-amber-400 hover:bg-amber-50"
        >
          <FileText size={30} className="mb-3 text-amber-600" />
          <span className="font-medium text-slate-700">
            {file ? file.name : "Select original diploma PDF"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            PDF format only
          </span>
          <input
            id="revoke-file"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError("");
              setMessage("");
              setRecord(null);
              setTransactionHash("");
            }}
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldAlert size={18} />
          {loading ? "Processing..." : "Revoke Diploma"}
        </button>
      </form>

      {record && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            {record.valid ? (
              <AlertCircle className="text-amber-600" size={20} />
            ) : (
              <XCircle className="text-red-600" size={20} />
            )}
            Diploma record
          </h2>

          <div className="space-y-2 break-all text-sm text-slate-700">
            <p><strong>Student:</strong> {record.studentName}</p>
            <p><strong>Program:</strong> {record.program}</p>
            <p><strong>Graduation year:</strong> {record.year}</p>
            <p><strong>SHA-256:</strong> {record.hash}</p>
            <p>
              <strong>Status:</strong>{" "}
              {record.valid ? "Valid" : "Revoked"}
            </p>
          </div>

          {transactionHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block pt-2 text-sm font-medium text-blue-700 underline"
            >
              View revocation transaction on Etherscan
            </a>
          )}
        </div>
      )}
    </div>
  );
}
