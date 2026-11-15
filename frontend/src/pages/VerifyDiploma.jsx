
import { useState } from "react";
import { ethers } from "ethers";
import { Upload, Search, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import contractArtifact from "../contract/DiplomaCertification.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// Public Sepolia RPC: read-only verification does not require MetaMask.
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

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

export default function VerifyDiploma() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleVerify(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select a diploma PDF first.");
      return;
    }

    if (file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (!CONTRACT_ADDRESS) {
      setError("Contract address is missing. Check frontend/.env.");
      return;
    }

    setLoading(true);

    try {
      // 1. Calculate the uploaded PDF's SHA-256 hash.
      const hash = await calculateSHA256(file);

      // 2. Connect to Sepolia using a public RPC.
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        provider
      );

      // 3. Read the diploma record from the blockchain.
      const [exists, diploma] = await contract.verifierDiplome(hash);

      if (!exists) {
        setResult({
          type: "not-found",
          hash,
        });
      } else if (!diploma.valide) {
        setResult({
          type: "revoked",
          hash,
          studentName: diploma.nomEtudiant,
          program: diploma.filiere,
          year: Number(diploma.annee),
          cid: diploma.cid,
          issueDate: Number(diploma.dateEmission),
        });
      } else {
        setResult({
          type: "valid",
          hash,
          studentName: diploma.nomEtudiant,
          program: diploma.filiere,
          year: Number(diploma.annee),
          cid: diploma.cid,
          issueDate: Number(diploma.dateEmission),
        });
      }
    } catch (err) {
      console.error("Diploma verification error:", err);
      setError(
        err.shortMessage ||
        err.reason ||
        err.message ||
        "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = result?.issueDate
    ? new Date(result.issueDate * 1000).toLocaleDateString()
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Verify Diploma
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload an academic diploma to verify its authenticity on Ethereum Sepolia.
        </p>
      </div>

      <form
        onSubmit={handleVerify}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Search size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              Diploma verification
            </h2>
            <p className="text-sm text-slate-500">
              The original PDF is not uploaded again. Only its hash is checked.
            </p>
          </div>
        </div>

        <label
          htmlFor="verify-file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50"
        >
          <Upload size={30} className="mb-3 text-blue-600" />
          <span className="font-medium text-slate-700">
            {file ? file.name : "Select a diploma PDF"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Choose the exact original PDF to verify
          </span>
          <input
            id="verify-file"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={18} />
          {loading ? "Checking blockchain..." : "Verify Diploma"}
        </button>
      </form>

      {result && (
        <div className={`rounded-xl border p-6 ${
          result.type === "valid"
            ? "border-green-200 bg-green-50"
            : result.type === "revoked"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="mb-5 flex items-center gap-3">
            {result.type === "valid" ? (
              <CheckCircle size={30} className="text-green-600" />
            ) : result.type === "revoked" ? (
              <XCircle size={30} className="text-red-600" />
            ) : (
              <AlertCircle size={30} className="text-amber-600" />
            )}

            <div>
              <h2 className="font-bold text-slate-900">
                {result.type === "valid"
                  ? "Authentic Diploma"
                  : result.type === "revoked"
                  ? "Revoked Diploma"
                  : "Diploma Not Registered"}
              </h2>
              <p className="text-sm text-slate-600">
                {result.type === "valid"
                  ? "The PDF hash matches a valid blockchain record."
                  : result.type === "revoked"
                  ? "This diploma exists but has been revoked by the university."
                  : "No diploma with this PDF hash was found on the blockchain."}
              </p>
            </div>
          </div>

          {result.type !== "not-found" && (
            <div className="space-y-3 border-t border-slate-200/70 pt-4 text-sm text-slate-700">
              <p><strong>Student:</strong> {result.studentName}</p>
              <p><strong>Program:</strong> {result.program}</p>
              <p><strong>Graduation year:</strong> {result.year}</p>
              <p><strong>Issue date:</strong> {formattedDate}</p>
              <p className="break-all"><strong>PDF SHA-256:</strong> {result.hash}</p>
              <p className="break-all"><strong>IPFS CID:</strong> {result.cid}</p>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Verification is based on the SHA-256 hash stored in the deployed
            Ethereum Sepolia smart contract.
          </p>
        </div>
      )}
    </div>
  );
}
