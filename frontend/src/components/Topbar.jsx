
import { Bell, Search, Wallet, LogOut, ShieldCheck, AlertTriangle } from "lucide-react";
import { useWallet } from "../context/WalletContext";

export default function Topbar() {
  const {
    account,
    isConnected,
    isSepolia,
    isAdmin,
    loading,
    walletError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  return (
    <header className="min-h-20 bg-white border-b border-slate-200 px-5 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="font-semibold text-slate-800">
          University Administration
        </h2>
        <p className="text-xs text-slate-500">
          Diploma certification management
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-5">
        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
          <Search size={17} className="text-slate-400" />
          <span className="text-sm text-slate-400">
            Search diplomas...
          </span>
        </div>

        <button
          type="button"
          title="Notifications"
          className="text-slate-500 hover:text-blue-600"
        >
          <Bell size={20} />
        </button>

        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            isConnected && isSepolia
              ? "bg-green-50 text-green-700"
              : isConnected
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isConnected && isSepolia ? (
            <ShieldCheck size={16} />
          ) : isConnected ? (
            <AlertTriangle size={16} />
          ) : (
            <Wallet size={16} />
          )}

          <span>
            {isConnected
              ? isSepolia
                ? "Ethereum Sepolia"
                : "Wrong network"
              : "Wallet disconnected"}
          </span>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-800">
                {shortAddress}
              </p>
              <p className={`text-xs ${isAdmin ? "text-green-600" : "text-slate-500"}`}>
                {isSepolia
                  ? isAdmin
                    ? "University Admin"
                    : "Connected wallet"
                  : "Switch to Sepolia"}
              </p>
            </div>

            <button
              type="button"
              onClick={disconnectWallet}
              title="Disconnect from this application"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
            >
              <LogOut size={17} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectWallet}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Wallet size={16} />
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>

      {walletError && (
        <p className="w-full text-right text-xs text-red-600">
          {walletError}
        </p>
      )}
    </header>
  );
}
