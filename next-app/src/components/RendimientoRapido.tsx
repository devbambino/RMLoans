"use client";
//src/components/RendimientoRapido.tsx
import { useState } from "react";
import { useMorphoLend } from "../hooks/useMorphoLend";
import { usePrivy } from "@privy-io/react-auth";
import {
  CheckCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CircleStackIcon,
  WalletIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

export default function RendimientoRapido() {
  const { authenticated, login } = usePrivy();
  const {
    loading,
    step,
    error,
    mxnbBalance,
    vaultAssetsBalance,
    tvl,
    apy,
    withdrawnAmount,
    yieldEarned,
    executeDeposit,
    executeWithdraw,
    refreshData,
    resetState,
  } = useMorphoLend();

  const [depositAmount, setDepositAmount] = useState("");

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    await executeDeposit(depositAmount);
    setDepositAmount("");
  };

  const handleWithdrawAll = async () => {
    await executeWithdraw(0n, true);
  };

  const handleReset = () => {
    setDepositAmount("");
    resetState();
  };

  // Steps mapping
  const getStepLabel = (s: number) => {
    switch (s) {
      case 1:
        return "Approving MXNB...";
      case 2:
        return "Depositing in Vault...";
      case 3:
        return "Confirming...";
      case 11:
        return "Withdrawing Liquidity...";
      default:
        return "Processing...";
    }
  };

  // Derived states
  const hasLiquidity = parseFloat(vaultAssetsBalance) > 0;
  const isInsufficientBalance =
    depositAmount && parseFloat(depositAmount) > parseFloat(mxnbBalance);

  return (
    <div className="w-full max-w-md mx-auto p-1">
      <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Header Background Gradient */}
        <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                MXNB Yield
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Provide liquidity and earn interest
              </p>
            </div>
            <div className="p-3 rounded-full bg-white/5 border border-white/10">
              <ChartBarIcon className="w-6 h-6 text-[#50e2c3]" />
            </div>
          </div>

          {!authenticated ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-6">
                Connect your wallet to get started
              </p>
              <button
                onClick={login}
                className="w-full cursor-pointer py-3 px-4 bg-gradient-to-r from-[#50e2c3] to-cyan-500 hover:from-[#40d2b3] hover:to-cyan-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Balances Grid */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-2 mt-14 bg-white/5 rounded-xl border border-white/10">
                {/* Row 1 */}
                <div className="text-center p-2">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                    <WalletIcon className="w-3 h-3 text-[#50e2c3]" /> Available
                    MXNB
                  </div>
                  <div className="font-mono text-xs text-[#50e2c3] truncate">
                    {mxnbBalance} MXNB
                  </div>
                </div>
                <div className="text-center p-2 border-l border-white/5">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                    <CircleStackIcon className="w-3 h-3 text-purple-400" /> Your
                    Liquidity
                  </div>
                  <div className="font-mono text-xs text-purple-300 truncate">
                    {vaultAssetsBalance} MXNB
                  </div>
                </div>

                {/* Row 2 separator */}
                <div className="col-span-2 h-px bg-white/5 my-1" />

                {/* Row 2 */}
                <div className="text-center p-2">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                    <BanknotesIcon className="w-3 h-3 text-blue-400" /> TVL
                  </div>
                  <div className="font-mono text-xs text-blue-300 truncate">
                    {tvl} MXNB
                  </div>
                </div>
                <div className="text-center p-2 border-l border-white/5">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                    <ChartBarIcon className="w-3 h-3 text-yellow-400" /> APY
                  </div>
                  <div className="font-mono text-xs text-yellow-300 truncate">
                    {apy}%
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              {step === 4 && !loading ? (
                /* Success Screen (Deposit) */
                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20 border border-green-500/20">
                    <CheckCircleIcon className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Deposit Successful!
                    </h3>
                    <p className="text-gray-400">
                      Your liquidity has been successfully added.
                    </p>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full cursor-pointer py-4 px-6 bg-gradient-to-r from-[#50e2c3] to-cyan-500 hover:from-[#40d2b3] hover:to-cyan-400 text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-1"
                  >
                    Make Another Deposit
                  </button>
                </div>
              ) : step === 12 && !loading ? (
                /* Success Screen (Withdrawal) */
                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20 border border-purple-500/20">
                    <CheckCircleIcon className="w-10 h-10 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Withdrawal Successful!
                    </h3>
                    <div className="text-sm bg-white/5 p-4 rounded-lg space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Withdrawn:</span>
                        <span className="text-white font-mono">
                          {withdrawnAmount} MXNB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Yield Generated:</span>
                        <span className="text-green-400 font-mono">
                          {yieldEarned || "0.00"} MXNB
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full cursor-pointer py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-1"
                  >
                    Back to Home
                  </button>
                </div>
              ) : (
                /* Input Section */
                <div className="space-y-6 py-2">
                  {!loading && (
                    <div className="group">
                      <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                        How much MXNB do you want to deposit?
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-[#50e2c3]/50 focus:ring-1 focus:ring-[#50e2c3]/50 transition-all placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-400">
                            MXNB
                          </span>
                          <button
                            onClick={() => setDepositAmount(mxnbBalance)}
                            className="text-[10px] text-[#50e2c3] uppercase font-bold hover:underline"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                      {isInsufficientBalance && (
                        <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          ⚠️ Insufficient balance
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Stepper */}
                  {loading && (
                    <div className="space-y-3 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between text-xs text-gray-400 uppercase tracking-widest mb-1">
                        <span>
                          {step >= 11
                            ? "Processing Withdrawal..."
                            : "Processing Deposit..."}
                        </span>
                        <span>
                          {step >= 11 ? "1 / 1" : `${Math.min(step, 3)} / 3`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        {step >= 11 ? (
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500 ease-out animate-pulse"
                            style={{ width: "100%" }}
                          />
                        ) : (
                          <div
                            className="h-full bg-gradient-to-r from-[#50e2c3] to-cyan-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                          />
                        )}
                      </div>
                      <p
                        className={`text-center text-sm font-medium animate-pulse ${step >= 11 ? "text-purple-400" : "text-[#50e2c3]"}`}
                      >
                        {getStepLabel(step)}
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 text-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                      <p className="font-semibold text-center mb-1">
                        {" "}
                        An error occurred while depositing{" "}
                      </p>
                      {error}
                    </div>
                  )}

                  {/* Deposit Button */}
                  {!loading && (
                    <button
                      onClick={handleDeposit}
                      disabled={
                        !depositAmount ||
                        parseFloat(depositAmount) <= 0 ||
                        isInsufficientBalance
                      }
                      className={`w-full cursor-pointer py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg 
                                                ${
                                                  !depositAmount ||
                                                  parseFloat(depositAmount) <=
                                                    0 ||
                                                  isInsufficientBalance
                                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    : "bg-gradient-to-r from-[#50e2c3] to-cyan-600 hover:from-[#40d2b3] hover:to-cyan-500 text-black shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                                                }
                                            `}
                    >
                      Deposit MXNB
                    </button>
                  )}

                  {/* Withdraw Button */}
                  {hasLiquidity && !loading && (
                    <button
                      onClick={handleWithdrawAll}
                      className="w-full mt-2 cursor-pointer py-3 px-6 rounded-xl font-bold text-sm text-gray-300 border border-white/10 hover:bg-white/5 transition-all"
                    >
                      Withdraw All
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
