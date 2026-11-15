
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ShieldAlert, Wallet, Network } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import IssueDiploma from "./pages/IssueDiploma";
import VerifyDiploma from "./pages/VerifyDiploma";
import AllDiplomas from "./pages/AllDiplomas";
import RevokeDiploma from "./pages/RevokeDiploma";

import { WalletProvider, useWallet } from "./context/WalletContext";

function AdminRoute({ children }) {
  const {
    isConnected,
    isSepolia,
    isAdmin,
    connectWallet,
    loading,
    walletError,
  } = useWallet();

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Wallet size={28} />
        </div>

        <h2 className="text-xl font-bold text-slate-900">
          Administrator connection required
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Connect the university administrator wallet to access this page.
        </p>

        <button
          onClick={connectWallet}
          disabled={loading}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Connecting..." : "Connect MetaMask"}
        </button>

        {walletError && (
          <p className="mt-4 text-sm text-red-600">{walletError}</p>
        )}
      </div>
    );
  }

  if (!isSepolia) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <Network size={32} className="mx-auto mb-4 text-amber-600" />

        <h2 className="text-xl font-bold text-slate-900">
          Wrong network
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Switch MetaMask to Ethereum Sepolia to access administrator functions.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert size={32} className="mx-auto mb-4 text-red-600" />

        <h2 className="text-xl font-bold text-slate-900">
          Access denied
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          This wallet is not the owner of the DiplomaChain smart contract.
          Only the university administrator can use this function.
        </p>
      </div>
    );
  }

  return children;
}

function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Topbar />

        <main className="mx-auto max-w-7xl p-6 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/diplomas" element={<AllDiplomas />} />
            <Route path="/verify" element={<VerifyDiploma />} />

            <Route
              path="/issue"
              element={
                <AdminRoute>
                  <IssueDiploma />
                </AdminRoute>
              }
            />

            <Route
              path="/revoke"
              element={
                <AdminRoute>
                  <RevokeDiploma />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </WalletProvider>
  );
}
