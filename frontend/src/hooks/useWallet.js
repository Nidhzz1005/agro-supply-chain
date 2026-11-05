import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import SupplyChainArtifact from "../contracts/contracts/SupplyChain.sol/SupplyChain.json";
import contractAddress from "../contracts/contract-address.json";

const HARDHAT_CHAIN_ID = "0x7a69"; // 31337

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);

  // Helper to build contract from current active signer
  async function buildContract() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const activeAccount = await signer.getAddress();
    const instance = new ethers.Contract(
      contractAddress.SupplyChain,
      SupplyChainArtifact.abi,
      signer
    );
    return { instance, activeAccount };
  }

  const connect = useCallback(async () => {
    setError(null);
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected. Please install it.");

      // Switch to Hardhat network if needed
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HARDHAT_CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: HARDHAT_CHAIN_ID,
              chainName: "Hardhat Local",
              rpcUrls: ["http://127.0.0.1:8545"],
            }],
          });
        }
      }

      // Request accounts — MetaMask will show whichever is currently selected
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const { instance, activeAccount } = await buildContract();
      setAccount(activeAccount);
      setContract(instance);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Listen for account switches in MetaMask and auto-update
  useEffect(() => {
    if (!window.ethereum) return;

    async function handleAccountChange(accounts) {
      if (accounts.length === 0) {
        setAccount(null);
        setContract(null);
        return;
      }
      // Rebuild contract with newly selected account
      try {
        const { instance, activeAccount } = await buildContract();
        setAccount(activeAccount);
        setContract(instance);
      } catch (err) {
        setError(err.message);
      }
    }

    window.ethereum.on("accountsChanged", handleAccountChange);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountChange);
  }, []);

  return { account, contract, error, connect };
}
