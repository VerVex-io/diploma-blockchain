
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ethers } from "ethers";
import contractArtifact from "../contract/DiplomaCertification.json";

const WalletContext = createContext(null);

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const SEPOLIA_CHAIN_ID = 11155111n;

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  const refreshWallet = useCallback(async (accounts) => {
    if (!window.ethereum) {
      setAccount("");
      setIsConnected(false);
      setChainId(null);
      setIsAdmin(false);
      return;
    }

    const selectedAccounts =
      accounts || (await window.ethereum.request({ method: "eth_accounts" }));

    const currentAccount = selectedAccounts?.[0] || "";

    if (!currentAccount) {
      setAccount("");
      setIsConnected(false);
      setChainId(null);
      setIsAdmin(false);
      return;
    }

    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    setAccount(currentAccount);
    setChainId(BigInt(currentChainId));
    setIsConnected(true);
    setIsAdmin(false);

    if (
      BigInt(currentChainId) === SEPOLIA_CHAIN_ID &&
      CONTRACT_ADDRESS
    ) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractArtifact.abi,
          provider
        );

        const owner = await contract.owner();

        setIsAdmin(
          owner.toLowerCase() === currentAccount.toLowerCase()
        );
      } catch (error) {
        console.error("Could not check contract owner:", error);
        setIsAdmin(false);
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setWalletError("MetaMask is not installed or enabled.");
      return;
    }

    setLoading(true);
    setWalletError("");

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      await refreshWallet(accounts);
    } catch (error) {
      console.error("Wallet connection error:", error);

      if (error.code === 4001) {
        setWalletError("Wallet connection was rejected.");
      } else {
        setWalletError(error.shortMessage || error.message || "Connection failed.");
      }
    } finally {
      setLoading(false);
    }
  }, [refreshWallet]);

  // This clears the app's connection display only.
  // It does not revoke MetaMask's site permissions.
  const disconnectWallet = useCallback(() => {
    setAccount("");
    setChainId(null);
    setIsConnected(false);
    setIsAdmin(false);
    setWalletError("");
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      refreshWallet(accounts).catch(console.error);
    };

    const handleChainChanged = () => {
      refreshWallet().catch(console.error);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    refreshWallet().catch(console.error);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [refreshWallet]);

  const isSepolia = chainId === SEPOLIA_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isConnected,
        isSepolia,
        isAdmin,
        loading,
        walletError,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider.");
  }

  return context;
}
