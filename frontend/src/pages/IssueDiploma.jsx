
import { useState } from "react";
import { ethers } from "ethers";
import { FileText, Upload, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import contractArtifact from "../contract/DiplomaCertification.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const API_URL = import.meta.env.VITE_API_URL;
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

export default function IssueDiploma() {
  const [studentName, setStudentName] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [issuedDetails, setIssuedDetails] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setTransactionHash("");
    setIssuedDetails(null);

    if (!studentName.trim() || !program.trim() || !year || !file) {
      setError("Please complete all fields and select a PDF.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("The selected file must have a .pdf extension.");
      return;
    }

    if (!window.ethereum) {
      setError("MetaMask was not detected. Please install or enable MetaMask.");
      return;
    }

    if (!CONTRACT_ADDRESS || !API_URL) {
      setError("Missing frontend environment configuration. Check frontend/.env.");
      return;
    }

    setLoading(true);

    try {
      // 1. Calculate the PDF hash in the browser.
      setStatus("Calculating PDF SHA-256 hash...");
      const pdfHash = await calculateSHA256(file);

      // 2. Upload the PDF to the backend / Pinata.
      setStatus("Uploading PDF to IPFS...");
      const formData = new FormData();
      formData.append("diploma", file);

      const uploadResponse = await fetch(`${API_URL}/api/diplomas/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success || !uploadData.cid) {
        throw new Error(uploadData.message || "PDF upload failed.");
      }

      // 3. Connect MetaMask.
      setStatus("Connecting to MetaMask...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          "Wrong network. Please switch MetaMask to Ethereum Sepolia and try again."
        );
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      // 4. Connect to the deployed contract.
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        signer
      );

      const owner = await contract.owner();

      if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          "Connected wallet is not the contract owner. Connect the university admin wallet."
        );
      }

      // 5. Check for an existing diploma with the same hash.
      setStatus("Checking whether this diploma is already registered...");
      const [exists] = await contract.verifierDiplome(pdfHash);

      if (exists) {
        throw new Error("This PDF is already registered on the blockchain.");
      }

      // 6. Register the diploma on Sepolia.
      setStatus("Waiting for MetaMask transaction approval...");
      const transaction = await contract.emettreDiplome(
        pdfHash,
        uploadData.cid,
        studentName.trim(),
        program.trim(),
        Number(year)
      );

      setTransactionHash(transaction.hash);
      setStatus("Transaction submitted. Waiting for blockchain confirmation...");

      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("The blockchain transaction failed.");
      }

      setIssuedDetails({
        hash: pdfHash,
        cid: uploadData.cid,
        studentName: studentName.trim(),
        program: program.trim(),
        year: Number(year),
        transactionHash: transaction.hash,
      });

      setStatus("Diploma successfully registered on Sepolia!");
      setStudentName("");
      setProgram("");
      setYear(new Date().getFullYear());
      setFile(null);

      const fileInput = document.getElementById("diploma-file");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Diploma issuance error:", err);
      setError(err.shortMessage || err.reason || err.message || "Issuance failed.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issue Diploma</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register a student's academic diploma on the Ethereum Sepolia blockchain.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Student information</h2>
            <p className="text-sm text-slate-500">
              Enter the details that will be stored in the diploma record.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Student full name
            </label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Ahmed Ben Ali"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Program / Degree
            </label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. Informatique"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Graduation year
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Diploma PDF
          </label>
          <label
            htmlFor="diploma-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <Upload size={30} className="mb-3 text-blue-600" />
            <span className="font-medium text-slate-700">
              {file ? file.name : "Click to select a diploma PDF"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              PDF format only
            </span>
            <input
              id="diploma-file"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            {issuedDetails ? (
              <CheckCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <Wallet size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{status}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={18} />
          {loading ? "Processing..." : "Issue Diploma"}
        </button>
      </form>

      {issuedDetails && (
        <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle size={20} />
            Diploma registered successfully
          </h2>
          <div className="space-y-2 break-all text-sm text-slate-700">
            <p><strong>Student:</strong> {issuedDetails.studentName}</p>
            <p><strong>Program:</strong> {issuedDetails.program}</p>
            <p><strong>Year:</strong> {issuedDetails.year}</p>
            <p><strong>SHA-256:</strong> {issuedDetails.hash}</p>
            <p><strong>IPFS CID:</strong> {issuedDetails.cid}</p>
            <p>
              <strong>Transaction:</strong>{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${issuedDetails.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                View on Sepolia Etherscan
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
