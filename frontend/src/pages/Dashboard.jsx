
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  FileCheck,
  Files,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Plus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import contractArtifact from "../contract/DiplomaCertification.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const DEPLOYMENT_BLOCK = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK);
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const BLOCK_CHUNK_SIZE = 5000;

export default function Dashboard() {
  const [diplomas, setDiplomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Contract address is missing from frontend/.env.");
      }

      if (!Number.isSafeInteger(DEPLOYMENT_BLOCK) || DEPLOYMENT_BLOCK <= 0) {
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
        throw new Error("Deployment block is ahead of the current Sepolia block.");
      }

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

      const issuedByHash = new Map();

      for (const event of issuedEvents) {
        const hash = event.args.hashPdf.toLowerCase();

        if (!issuedByHash.has(hash)) {
          issuedByHash.set(hash, event);
        }
      }

      const revokedHashes = new Set(
        revokedEvents.map((event) => event.args.hashPdf.toLowerCase())
      );

      const records = await Promise.all(
        Array.from(issuedByHash.entries()).map(
          async ([hash, issueEvent]) => {
            const [exists, diploma] = await contract.verifierDiplome(hash);

            if (!exists) return null;

            return {
              hash,
              student: diploma.nomEtudiant,
              program: diploma.filiere,
              year: Number(diploma.annee),
              issueDate: Number(diploma.dateEmission),
              valid: diploma.valide,
              issueTransaction: issueEvent.transactionHash,
              blockNumber: issueEvent.blockNumber,
              hasRevocationEvent: revokedHashes.has(hash),
            };
          }
        )
      );

      const sortedRecords = records
        .filter(Boolean)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setDiplomas(sortedRecords);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        err.shortMessage ||
        err.reason ||
        err.message ||
        "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalDiplomas = diplomas.length;
  const validDiplomas = diplomas.filter((d) => d.valid).length;
  const revokedDiplomas = totalDiplomas - validDiplomas;
  const recentDiplomas = diplomas.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here's your live certification activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/issue"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Issue New Diploma
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Diplomas"
          value={loading ? "..." : String(totalDiplomas)}
          description="Registered on Ethereum Sepolia"
          icon={Files}
          color="bg-blue-100 text-blue-600"
        />

        <StatCard
          title="Valid Diplomas"
          value={loading ? "..." : String(validDiplomas)}
          description="Currently marked as valid"
          icon={FileCheck}
          color="bg-green-100 text-green-600"
        />

        <StatCard
          title="Revoked Diplomas"
          value={loading ? "..." : String(revokedDiplomas)}
          description="Revoked by the university"
          icon={ShieldCheck}
          color="bg-red-100 text-red-600"
        />

        <StatCard
          title="Recent Activity"
          value={loading ? "..." : String(recentDiplomas.length)}
          description="Latest five issued diplomas"
          icon={Clock}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-blue-700 p-7 text-white">
        <div>
          <p className="text-sm text-blue-200">Blockchain Network</p>
          <h2 className="mt-2 text-2xl font-bold">Ethereum Sepolia</h2>
          <p className="mt-2 text-sm text-blue-100">
            Live statistics retrieved from the deployed smart contract.
          </p>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-white underline"
          >
            View smart contract <ExternalLink size={14} />
          </a>
        </div>

        <div className="rounded-xl bg-white/15 p-4">
          <ShieldCheck size={35} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
          <div>
            <h2 className="font-bold text-slate-900">Recent Diplomas</h2>
            <p className="mt-1 text-xs text-slate-500">
              Latest issuance records from the blockchain
            </p>
          </div>

          <Link
            to="/diplomas"
            className="flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            View All <ArrowUpRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <RefreshCw size={25} className="mx-auto mb-3 animate-spin" />
            Loading blockchain records...
          </div>
        ) : !error && recentDiplomas.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <Files size={35} className="mx-auto mb-3 text-slate-300" />
            No diploma records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Program</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4">Issue date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Transaction</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentDiplomas.map((diploma) => (
                  <tr key={diploma.hash} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {diploma.student}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {diploma.program}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {diploma.year}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(diploma.issueDate * 1000).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          diploma.valid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {diploma.valid ? "Valid" : "Revoked"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${diploma.issueTransaction}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        View <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lastUpdated && !loading && (
          <p className="px-6 py-3 text-right text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
