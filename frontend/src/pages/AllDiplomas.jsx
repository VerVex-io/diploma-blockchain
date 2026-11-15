
import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import contractArtifact from "../contract/DiplomaCertification.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const DEPLOYMENT_BLOCK = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK);
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const BLOCK_CHUNK_SIZE = 5000;

export default function AllDiplomas() {
  const [diplomas, setDiplomas] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDiplomas = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Contract address is missing from frontend/.env.");
      }

      if (
        !Number.isSafeInteger(DEPLOYMENT_BLOCK) ||
        DEPLOYMENT_BLOCK <= 0
      ) {
        throw new Error("Invalid VITE_DEPLOYMENT_BLOCK in frontend/.env.");
      }

      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        provider
      );

      const latestBlock = await provider.getBlockNumber();

      if (DEPLOYMENT_BLOCK > latestBlock) {
        throw new Error(
          "Deployment block is ahead of the current Sepolia block. Check frontend/.env."
        );
      }

      // Read events in small ranges to avoid RPC range limits.
      const issuedEvents = [];
      const revokedEvents = [];

      for (
        let fromBlock = DEPLOYMENT_BLOCK;
        fromBlock <= latestBlock;
        fromBlock += BLOCK_CHUNK_SIZE
      ) {
        const toBlock = Math.min(
          fromBlock + BLOCK_CHUNK_SIZE - 1,
          latestBlock
        );

        const [issued, revoked] = await Promise.all([
          contract.queryFilter(
            contract.filters.DiplomeEmis(),
            fromBlock,
            toBlock
          ),
          contract.queryFilter(
            contract.filters.DiplomeRevoque(),
            fromBlock,
            toBlock
          ),
        ]);

        issuedEvents.push(...issued);
        revokedEvents.push(...revoked);
      }

      // Keep one issuance event per PDF hash.
      const issuedByHash = new Map();

      for (const event of issuedEvents) {
        const hash = event.args.hashPdf.toLowerCase();

        if (!issuedByHash.has(hash)) {
          issuedByHash.set(hash, event);
        }
      }

      // Keep the latest revocation event per PDF hash.
      const revokedByHash = new Map();

      for (const event of revokedEvents) {
        const hash = event.args.hashPdf.toLowerCase();
        const previous = revokedByHash.get(hash);

        if (
          !previous ||
          event.blockNumber > previous.blockNumber ||
          (
            event.blockNumber === previous.blockNumber &&
            event.index > previous.index
          )
        ) {
          revokedByHash.set(hash, event);
        }
      }

      // Read the current on-chain record for every issued diploma.
      const records = await Promise.all(
        Array.from(issuedByHash.entries()).map(
          async ([hash, issueEvent]) => {
            const [exists, diploma] =
              await contract.verifierDiplome(hash);

            if (!exists) return null;

            const revokeEvent = revokedByHash.get(hash);

            return {
              hash,
              studentName: diploma.nomEtudiant,
              program: diploma.filiere,
              year: Number(diploma.annee),
              issueDate: Number(diploma.dateEmission),
              cid: diploma.cid,
              valid: diploma.valide,
              issueTransaction: issueEvent.transactionHash,
              revokeTransaction: revokeEvent?.transactionHash || null,
              blockNumber: issueEvent.blockNumber,
            };
          }
        )
      );

      const validRecords = records
        .filter(Boolean)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setDiplomas(validRecords);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Registry loading error:", err);
      setError(
        err.shortMessage ||
        err.reason ||
        err.message ||
        "Unable to load blockchain records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiplomas();
  }, [loadDiplomas]);

  const filteredDiplomas = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return diplomas;

    return diplomas.filter((diploma) =>
      [
        diploma.studentName,
        diploma.program,
        diploma.hash,
        diploma.cid,
        String(diploma.year),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [diplomas, search]);

  const validCount = diplomas.filter((d) => d.valid).length;
  const revokedCount = diplomas.length - validCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            All Diplomas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Blockchain registry of issued academic diplomas.
          </p>
        </div>

        <button
          onClick={loadDiplomas}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total diplomas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {diplomas.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Valid diplomas</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {validCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Revoked diplomas</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {revokedCount}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              Diploma Registry
            </h2>
            <p className="text-sm text-slate-500">
              Records retrieved directly from Ethereum Sepolia events.
            </p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, program, year, hash or CID..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <RefreshCw size={25} className="mx-auto mb-3 animate-spin" />
            Loading diploma records from Sepolia...
          </div>
        ) : !error && filteredDiplomas.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-700">
              {diplomas.length === 0
                ? "No diploma records found"
                : "No matching diplomas"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {diplomas.length === 0
                ? "Issued diploma events from the configured deployment block will appear here."
                : "Try another student name, program, year, or hash."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Issue date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Transaction</th>
                </tr>
              </thead>

              <tbody>
                {filteredDiplomas.map((diploma) => (
                  <tr
                    key={diploma.hash}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {diploma.studentName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {diploma.hash.slice(0, 12)}...
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {diploma.program}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {diploma.year}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {new Date(diploma.issueDate * 1000).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-4">
                      {diploma.valid ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          <CheckCircle size={14} />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          <XCircle size={14} />
                          Revoked
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${diploma.issueTransaction}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                      >
                        View issue tx
                        <ExternalLink size={13} />
                      </a>

                      {diploma.revokeTransaction && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${diploma.revokeTransaction}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center gap-1 text-xs text-red-600 hover:underline"
                        >
                          View revoke tx
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lastUpdated && !loading && (
          <p className="mt-4 text-right text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
